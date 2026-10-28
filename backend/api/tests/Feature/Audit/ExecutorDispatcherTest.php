<?php

use App\Audit\ExecutorDispatcher;
use App\Runs\Execution\ReplyKind;
use GuzzleHttp\Promise\PromiseInterface;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;
use Tests\Support\AuditExecutorDouble;
use Tests\Support\AuditWorld;

beforeEach(fn () => Sleep::fake());

it('sends every program once and returns one final reply per key', function () {
    AuditExecutorDouble::fake(AuditExecutorDouble::green());
    $programs = AuditWorld::keyedPrograms();

    $replies = app(ExecutorDispatcher::class)->dispatch($programs, 4);

    expect(array_keys($replies))->toBe(array_keys($programs));
    foreach ($replies as $reply) {
        expect($reply->kind)->toBe(ReplyKind::Result);
    }
    Http::assertSentCount(12);
    Sleep::assertNeverSlept();
});

it('posts the language and the composed program with the token, to the audit instance', function () {
    AuditExecutorDouble::fake(AuditExecutorDouble::green());
    $programs = AuditWorld::keyedPrograms('rust-01');

    app(ExecutorDispatcher::class)->dispatch($programs, 2);

    Http::assertSent(fn (Request $request) => $request->url() === 'http://executor-audit:8080/v1/run'
        && $request->header('Authorization') === ['Bearer '.AuditExecutorDouble::TOKEN]
        && $request->data() === ['language' => 'rust', 'program' => $programs['p0']->composed->text]);
});

it('waits what a 503 asks and sends again, without taking it as run (FR-008)', function (string $retryAfter, int $seconds) {
    AuditExecutorDouble::fake(AuditExecutorDouble::greenExcept([
        'solution_rust_01' => AuditExecutorDouble::busyThen(AuditExecutorDouble::passes(), $retryAfter),
    ]));

    $replies = app(ExecutorDispatcher::class)->dispatch(AuditWorld::keyedPrograms('rust-01'), 2);

    expect($replies['p0']->kind)->toBe(ReplyKind::Result);
    Sleep::assertSequence([Sleep::for($seconds)->seconds()]);
    Http::assertSentCount(3);
})->with([
    'what it says' => ['7', 7],
    'at most thirty seconds' => ['120', 30],
]);

it('does not send again a 500, an invalid body or a cut connection: they may have run (FR-008)', function (Closure $behavior, string $cause, ?int $status) {
    $attempts = 0;
    $behavior = $behavior();
    AuditExecutorDouble::fake(AuditExecutorDouble::greenExcept([
        'solution_rust_01' => function (string $nonce, string $program) use (&$attempts, $behavior): PromiseInterface {
            $attempts++;

            return $behavior($nonce, $program);
        },
    ]));

    $replies = app(ExecutorDispatcher::class)->dispatch(AuditWorld::keyedPrograms('rust-01'), 2);

    expect($replies['p0']->kind)->toBe(ReplyKind::Failed)
        ->and($replies['p0']->cause)->toBe($cause)
        ->and($replies['p0']->httpStatus)->toBe($status);
    expect($attempts)->toBe(1);
    Sleep::assertNeverSlept();
})->with([
    'a 500' => [fn () => AuditExecutorDouble::status(500), 'status', 500],
    'a 413' => [fn () => AuditExecutorDouble::status(413), 'status', 413],
    'an invalid body' => [fn () => fn () => Http::response(AuditExecutorDouble::result(['extra' => 1])), 'invalid_body', 200],
    'a connection cut while it ran' => [fn () => AuditExecutorDouble::connectionFails(), 'connection', null],
]);

it('waits a second for an executor it could not reach, and gives up after ten rounds without a verdict', function () {
    $programs = AuditWorld::keyedPrograms('rust-01');
    Http::allowStrayRequests();
    config(['runs.executor.url' => 'http://127.0.0.1:1', 'runs.executor.token' => AuditExecutorDouble::TOKEN, 'runs.executor.connect_timeout' => 2]);

    $replies = app(ExecutorDispatcher::class)->dispatch($programs, 2);

    expect($replies['p0']->kind)->toBe(ReplyKind::Failed)
        ->and($replies['p0']->cause)->toBe('unavailable')
        ->and($replies['p0']->httpStatus)->toBeNull();
    Sleep::assertSleptTimes(9);
});

it('asks ten times, no more, an executor that stays busy, and leaves that program without a verdict (FR-008)', function () {
    AuditExecutorDouble::fake(AuditExecutorDouble::greenExcept([
        'solution_rust_01' => fn (): PromiseInterface => Http::response(['error' => 'ejecutor ocupado'], 503, ['Retry-After' => '3']),
    ]));

    $replies = app(ExecutorDispatcher::class)->dispatch(AuditWorld::keyedPrograms('rust-01'), 2);

    expect($replies['p0']->kind)->toBe(ReplyKind::Failed)
        ->and($replies['p0']->cause)->toBe('unavailable')
        ->and($replies['p0']->httpStatus)->toBeNull()
        ->and($replies['p1']->kind)->toBe(ReplyKind::Result);
    Http::assertSentCount(11);
    Sleep::assertSleptTimes(9);
});
