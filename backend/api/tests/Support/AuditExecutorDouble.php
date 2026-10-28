<?php

namespace Tests\Support;

use Closure;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Promise\Create;
use GuzzleHttp\Promise\PromiseInterface;
use GuzzleHttp\Psr7\Request as PsrRequest;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use LogicException;

/** The audit executor at its HTTP edge, answering from the contract of spec 005 (contracts/executor.md). */
final class AuditExecutorDouble
{
    public const URL = 'http://executor-audit:8080';

    public const TOKEN = 'an-audit-token-of-at-least-thirty-two-bytes';

    /** @param  array<string, Closure(string, string): PromiseInterface>  $behaviors  keyed by a text of the program; the first match wins */
    public static function fake(array $behaviors): void
    {
        config(['runs.executor.url' => self::URL, 'runs.executor.token' => self::TOKEN]);
        Http::preventStrayRequests();
        Http::fake(['executor-audit:8080/*' => fn (Request $request): PromiseInterface => self::answer($request, $behaviors)]);
    }

    /** @return array<string, Closure(string, string): PromiseInterface> */
    public static function green(): array
    {
        return [
            'energia(5) == 35' => self::passes('PASS'),
            'energia(5) == 36' => self::passes('FAIL'),
            'Bytes(2) == 2048' => self::passes('PASS'),
            'Bytes(2) == 2049' => self::passes('FAIL'),
            'solution_rust_01' => self::passes(),
            'starter_rust_01' => self::fails(),
            'solution_rust_02' => self::passes(),
            'starter_rust_02' => self::compileError(),
            'solution_go_01' => self::passes(),
            'starter_go_01' => self::fails(),
            'solution_go_02' => self::passes(),
            'starter_go_02' => self::fails(),
        ];
    }

    /**
     * @param  array<string, Closure(string, string): PromiseInterface>  $changes
     * @return array<string, Closure(string, string): PromiseInterface>
     */
    public static function greenExcept(array $changes): array
    {
        $green = self::green();
        $behaviors = array_slice($green, 0, 4, true);
        foreach ($changes as $marker => $behavior) {
            $behaviors[$marker] = $behavior;
        }
        foreach ($green as $marker => $behavior) {
            $behaviors[$marker] ??= $behavior;
        }

        return $behaviors;
    }

    public static function connectionFails(string $message = 'cURL error 56: Recv failure: Connection reset by peer'): Closure
    {
        return fn (): PromiseInterface => Create::rejectionFor(new ConnectException($message, new PsrRequest('POST', self::URL.'/v1/run')));
    }

    public static function passes(?string $custom = null, int $compileMs = 900, int $runMs = 200): Closure
    {
        return fn (string $nonce): PromiseInterface => Http::response(self::result([
            'stdout' => self::markers($nonce, ['t1' => 'PASS', 't2' => 'PASS', 't3' => 'PASS'], $custom),
            'compileMs' => $compileMs,
            'runMs' => $runMs,
        ]));
    }

    public static function fails(string $failing = 't1', string $stderr = ''): Closure
    {
        return function (string $nonce) use ($failing, $stderr): PromiseInterface {
            $outcomes = ['t1' => 'PASS', 't2' => 'PASS', 't3' => 'PASS'];
            $outcomes[$failing] = 'FAIL';

            return Http::response(self::result(['stdout' => self::markers($nonce, $outcomes), 'stderr' => $stderr]));
        };
    }

    public static function compileError(string $stderr = "error[E0308]: mismatched types\n"): Closure
    {
        return fn (): PromiseInterface => Http::response(self::result(['phase' => 'compile', 'exitCode' => 1, 'stderr' => $stderr, 'compileMs' => 640, 'runMs' => 0]));
    }

    public static function exits(int $exitCode, string $stdout = ''): Closure
    {
        return fn (): PromiseInterface => Http::response(self::result(['exitCode' => $exitCode, 'stdout' => $stdout]));
    }

    public static function timesOut(): Closure
    {
        return fn (): PromiseInterface => Http::response(self::result(['exitCode' => 137, 'timedOut' => true, 'runMs' => 10000]));
    }

    public static function cutsOutput(): Closure
    {
        return fn (string $nonce): PromiseInterface => Http::response(self::result([
            'stdout' => "__TALLER_TEST__{$nonce}:t1:PASS\n".str_repeat('x', 100),
            'truncated' => true,
        ]));
    }

    public static function status(int $status): Closure
    {
        return fn (): PromiseInterface => Http::response(['error' => 'no se pudo ejecutar en el sandbox'], $status);
    }

    public static function busyThen(Closure $then, string $retryAfter = '2'): Closure
    {
        $calls = 0;

        return function (string $nonce, string $program) use (&$calls, $then, $retryAfter): PromiseInterface {
            $calls++;

            return $calls === 1 ? Http::response(['error' => 'ejecutor ocupado'], 503, ['Retry-After' => $retryAfter]) : $then($nonce, $program);
        };
    }

    /** @param  array<string, string>  $outcomes */
    public static function markers(string $nonce, array $outcomes, ?string $custom = null): string
    {
        $lines = [];
        foreach ($outcomes as $key => $outcome) {
            $lines[] = "__TALLER_TEST__{$nonce}:{$key}:{$outcome}";
        }
        if ($custom !== null) {
            $lines[] = "__TALLER_TEST__{$nonce}:custom:{$custom}";
        }
        $lines[] = "__TALLER_END__{$nonce}:".count($lines);

        return implode("\n", $lines)."\n";
    }

    /**
     * @param  array<string, mixed>  $changes
     * @return array<string, mixed>
     */
    public static function result(array $changes = []): array
    {
        return [
            'phase' => 'run', 'exitCode' => 0, 'stdout' => '', 'stderr' => '', 'truncated' => false, 'timedOut' => false,
            'oomKilled' => false, 'compileMs' => 900, 'runMs' => 200, ...$changes,
        ];
    }

    /** @param  array<string, Closure(string, string): PromiseInterface>  $behaviors */
    private static function answer(Request $request, array $behaviors): PromiseInterface
    {
        if ($request->url() === self::URL.'/healthz') {
            return Http::response('ok');
        }
        if ($request->header('Authorization') !== ['Bearer '.self::TOKEN]) {
            return Http::response(['error' => 'token inválido'], 401);
        }
        $program = $request->data()['program'] ?? '';
        if (! is_string($program) || $program === '') {
            return Http::response(['error' => 'lenguaje no soportado'], 400);
        }
        foreach ($behaviors as $marker => $behavior) {
            if (str_contains($program, $marker)) {
                return $behavior(self::nonceOf($program), $program);
            }
        }

        throw new LogicException('The audit double has no behavior for this program.');
    }

    private static function nonceOf(string $program): string
    {
        return preg_match('/__TALLER_END__([0-9a-f]{32})/', $program, $match) === 1 ? $match[1] : throw new LogicException('A program without a nonce.');
    }
}
