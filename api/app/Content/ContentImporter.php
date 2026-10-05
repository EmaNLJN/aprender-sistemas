<?php

namespace App\Content;

use Illuminate\Support\Facades\DB;

/**
 * `content:import` (ADR 0006 D12): the document and its meta to the content tables. It computes the
 * difference outside the transaction and, in a single one, writes only what changed, checks the
 * rules between rows and checks itself: it assembles the 17 portions from the tables with the same
 * code the API uses and demands the hash the generator fixed. That runs on every import, also when
 * there is nothing to write. After committing it warms the body cache. The first thing it does
 * inside the transaction is to check that its connection still holds the import lock.
 */
final class ContentImporter
{
    public function __construct(
        private ContentRows $rows,
        private ContentStore $store,
        private ContentDiff $diff,
        private ContentWriter $writer,
        private ContentInvariants $invariants,
        private PortionRenderer $renderer,
        private BodyCache $cache,
        private ContentImports $imports,
        private ImportLock $lock,
    ) {}

    /** What the import would do, without writing anything (`--dry-run`). */
    public function plan(ContentSource $source): ContentPlan
    {
        return $this->diff->between(
            $this->rows->fromSource($source),
            $this->store->rows(),
            $this->store->gradingVersions(),
            $this->imports->latest(),
            $source->meta,
        );
    }

    /**
     * @return bool false if the connection no longer holds the import lock: nothing was written
     *
     * @throws InvalidContent|ContentMismatch if something does not add up: the whole transaction is rolled back
     */
    public function import(ContentSource $source, ContentPlan $plan): bool
    {
        $before = $this->imports->latest();
        // Writers run in READ COMMITTED, per transaction (D08), and without retries of their own:
        // the only backoff is the `migrate` step's, so they do not multiply (ADR 0006 §8).
        DB::statement('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
        $bodies = DB::transaction(function () use ($source, $plan): ?array {
            // Inside a transaction Laravel no longer reconnects in silence, so a connection that was
            // replaced since the command checked the lock, and with it lost the lock and the
            // isolation level above, shows up here and not after writing.
            if (! $this->lock->stillHeld()) {
                return null;
            }
            $importId = $plan->recordImport ? $this->writer->recordImport($source, $plan) : null;
            $this->writer->write($plan, $importId);
            $this->invariants->assert();

            return $this->verified($source);
        }, attempts: 1);
        if ($bodies === null) {
            return false;
        }

        $this->warm($bodies, $source, $before);

        return true;
    }

    /**
     * The 17 portions assembled from the tables, each with the hash the meta says.
     *
     * @return array<string, string> bodies by portion
     */
    private function verified(ContentSource $source): array
    {
        $bodies = [];
        foreach (Portion::cases() as $portion) {
            $body = $this->renderer->render($portion);
            if (hash('sha256', $body) !== $source->meta['portions'][$portion->value]) {
                throw ContentMismatch::of($portion, $this->difference($source, $portion, $body));
            }
            $bodies[$portion->value] = $body;
        }

        return $bodies;
    }

    private function difference(ContentSource $source, Portion $portion, string $body): string
    {
        return JsonDiff::first($source->part($portion), PublishedJson::decode($body), $portion->value)
            ?? 'los valores coinciden pero los bytes no: revisá los escapes o el formato del generador';
    }

    /**
     * Stores the 17 bodies (renewing their life even if unchanged) and deletes those of the hashes
     * this import replaces.
     *
     * @param  array<string, string>  $bodies
     */
    private function warm(array $bodies, ContentSource $source, ?LatestImport $before): void
    {
        foreach (Portion::cases() as $portion) {
            $hash = $source->meta['portions'][$portion->value];
            $this->cache->put($portion, $hash, $bodies[$portion->value]);
            $replaced = $before?->portionHashes[$portion->value];
            if ($replaced !== null && $replaced !== $hash) {
                $this->cache->forget($portion, $replaced);
            }
        }
    }
}
