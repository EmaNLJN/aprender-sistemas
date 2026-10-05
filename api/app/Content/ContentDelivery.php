<?php

namespace App\Content;

use App\Http\ApiError;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

/**
 * Delivers a portion or an exercise (ADR 0006 D11). The response is the stored bytes untouched, never
 * re-encoded: no `response()->json()` and no JsonResource, which would use other flags.
 *
 * A 304 builds nothing: it reads only the latest import, plus the exercise row for an exercise, because
 * a retired one answers 410 before 304. A missing portion body, and every exercise (they are never
 * cached), is built inside a snapshot that re-reads the latest import, so everything comes from the same
 * one. The built body is verified against its hash before it is served or cached; a mismatch is a logged
 * 503 `maintenance`. An ID that cannot be an ID gets a 404 without touching the database.
 */
final class ContentDelivery
{
    public function __construct(
        private ContentImports $imports,
        private BodyCache $bodies,
        private PortionRenderer $renderer,
    ) {}

    public function portion(Request $request, Portion $portion): SymfonyResponse
    {
        $latest = $this->imports->latest();
        if ($latest === null) {
            return $this->notImported();
        }
        if (ConditionalRequest::matches($request, $latest->etag($portion))) {
            return $this->notModified($latest, $latest->etag($portion));
        }

        $hash = $latest->portionHashes[$portion->value];
        $body = $this->bodies->get($portion, $hash);
        if ($body === null) {
            [$latest, $body] = ContentSnapshot::read(function () use ($portion) {
                $latest = $this->imports->latest();

                return [$latest, $latest === null ? null : $this->renderer->render($portion)];
            });
            if ($latest === null) {
                return $this->notImported();
            }
            $hash = $latest->portionHashes[$portion->value];
            if ($body === null || hash('sha256', $body) !== $hash) {
                return $this->maintenance("la porción {$portion->value} armada desde las tablas no tiene el hash del import {$latest->id}");
            }
            $this->bodies->put($portion, $hash, $body);
            if (ConditionalRequest::matches($request, $latest->etag($portion))) {
                return $this->notModified($latest, $latest->etag($portion));
            }
        }

        return $this->ok($body, $latest, $latest->etag($portion));
    }

    public function exercise(Request $request, string $id): SymfonyResponse
    {
        if (preg_match('/\A[a-z0-9][a-z0-9-]{0,63}\z/', $id) !== 1) {
            return $this->notFound();
        }
        $latest = $this->imports->latest();
        if ($latest === null) {
            return $this->notImported();
        }
        $row = DB::table('exercises')->where('id', $id)->first(['status', 'title', 'retired_at', 'content_hash']);
        if ($row === null) {
            return $this->notFound();
        }
        if ($row->status !== 'active') {
            return $this->retired($id, $row->title, $row->retired_at);
        }
        $etag = '"'.substr($row->content_hash, 0, 32).'"';
        if (ConditionalRequest::matches($request, $etag)) {
            return $this->notModified($latest, $etag);
        }

        [$latest, $row, $body] = ContentSnapshot::read(function () use ($id) {
            $latest = $this->imports->latest();
            $row = DB::table('exercises')->where('id', $id)->first(['status', 'title', 'retired_at', 'content_hash']);

            return [$latest, $row, $row?->status === 'active' ? $this->renderer->renderExercise($id) : null];
        });
        if ($latest === null) {
            return $this->notImported();
        }
        if ($row === null) {
            return $this->notFound();
        }
        if ($row->status !== 'active') {
            return $this->retired($id, $row->title, $row->retired_at);
        }
        if ($body === null || hash('sha256', $body) !== $row->content_hash) {
            return $this->maintenance("el ejercicio {$id} armado desde las tablas no tiene su content_hash");
        }

        return $this->ok($body, $latest, '"'.substr($row->content_hash, 0, 32).'"');
    }

    private function ok(string $body, LatestImport $latest, string $etag): Response
    {
        return new Response($body, 200, $this->headers($latest, $etag) + ['Content-Type' => 'application/json']);
    }

    private function notModified(LatestImport $latest, string $etag): Response
    {
        return new Response('', 304, $this->headers($latest, $etag));
    }

    /** @return array<string, string> */
    private function headers(LatestImport $latest, string $etag): array
    {
        return ['ETag' => $etag, 'Content-Version' => $latest->version(), 'Cache-Control' => 'private, no-cache'];
    }

    private function notFound(): SymfonyResponse
    {
        return ApiError::response(404, 'not_found', 'No existe ese ejercicio.');
    }

    private function retired(string $id, string $title, string $retiredAt): SymfonyResponse
    {
        return ApiError::response(410, 'content_retired', 'Ese ejercicio se retiró del currículo.', [
            'id' => $id,
            'title' => $title,
            'retiredAt' => Carbon::parse($retiredAt, 'UTC')->format('Y-m-d\TH:i:s.v\Z'),
        ]);
    }

    private function notImported(): SymfonyResponse
    {
        return ApiError::response(503, 'content_not_imported', 'Todavía no hay contenido importado.', headers: ['Retry-After' => '60']);
    }

    private function maintenance(string $detail): SymfonyResponse
    {
        Log::error("Contenido no servido: {$detail}.");

        return ApiError::response(503, 'maintenance', 'El contenido se está actualizando: reintentá en unos segundos.', headers: ['Retry-After' => '5']);
    }
}
