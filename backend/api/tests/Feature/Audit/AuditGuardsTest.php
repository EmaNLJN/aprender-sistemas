<?php

use App\Audit\AuditLock;
use App\Audit\AuditRefused;
use App\Audit\ExecutorPreflight;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\Support\AuditExecutorDouble;

it('passes when the instance is alive and takes the token, and runs nothing to know it', function () {
    AuditExecutorDouble::fake([]);

    app(ExecutorPreflight::class)->check();

    Http::assertSentCount(2);
    Http::assertSent(fn (Request $request) => $request->method() === 'GET' && $request->url() === 'http://executor-audit:8080/healthz');
    Http::assertSent(fn (Request $request) => $request->method() === 'POST' && $request->data() === ['language' => '', 'program' => '']);
});

it('refuses when it cannot reach the instance (FR-013)', function () {
    Http::allowStrayRequests();
    config(['runs.executor.url' => 'http://127.0.0.1:1', 'runs.executor.token' => AuditExecutorDouble::TOKEN, 'audit.preflight.connect_timeout' => 2]);

    expect(fn () => app(ExecutorPreflight::class)->check())->toThrow(AuditRefused::class, 'No alcanzo al ejecutor de auditoría en http://127.0.0.1:1');
});

it('refuses when healthz does not answer', function () {
    config(['runs.executor.url' => AuditExecutorDouble::URL, 'runs.executor.token' => AuditExecutorDouble::TOKEN]);
    Http::preventStrayRequests();
    Http::fake([
        'executor-audit:8080/healthz' => Http::response('', 503),
        'executor-audit:8080/*' => Http::response(['error' => 'lenguaje no soportado'], 400),
    ]);

    expect(fn () => app(ExecutorPreflight::class)->check())->toThrow(AuditRefused::class, '(GET /healthz respondió 503)');
});

it('refuses when the instance rejects the token (FR-013)', function () {
    AuditExecutorDouble::fake([]);
    config(['runs.executor.token' => str_repeat('x', 40)]);

    expect(fn () => app(ExecutorPreflight::class)->check())
        ->toThrow(AuditRefused::class, 'El ejecutor de auditoría rechazó el token (401): el EXECUTOR_TOKEN de audit no es el de executor-audit.');
});

it('refuses when the token probe answers something other than 400', function () {
    config(['runs.executor.url' => AuditExecutorDouble::URL, 'runs.executor.token' => AuditExecutorDouble::TOKEN]);
    Http::preventStrayRequests();
    Http::fake([
        'executor-audit:8080/healthz' => Http::response('ok'),
        'executor-audit:8080/*' => Http::response(['error' => 'boom'], 500),
    ]);

    expect(fn () => app(ExecutorPreflight::class)->check())
        ->toThrow(AuditRefused::class, 'El ejecutor de auditoría respondió 500 a la sonda del token; se esperaba 400.');
});

it('refuses another run while one holds the lock (FR-013)', function () {
    config(['database.connections.audit_holder' => config('database.connections.mysql')]);
    $holder = DB::connection('audit_holder');
    expect($holder->scalar("select get_lock(concat(database(), ':curriculum-audit'), 0)"))->toBeIn([1, '1']);

    try {
        expect(fn () => app(AuditLock::class)->acquire())
            ->toThrow(AuditRefused::class, 'Ya hay otra corrida de auditoría en curso: esperá a que termine. Dos corridas a la vez se borrarían los contenedores.');
    } finally {
        $holder->scalar("select release_lock(concat(database(), ':curriculum-audit'))");
        DB::purge('audit_holder');
    }
});

it('takes the lock and gives it back', function () {
    $lock = app(AuditLock::class);

    $lock->acquire();
    $lock->release();
    $lock->acquire();
    $lock->release();

    expect(DB::scalar("select is_free_lock(concat(database(), ':curriculum-audit'))"))->toBeIn([1, '1']);
});
