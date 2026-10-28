<?php

use App\Runs\Execution\ExecutorClient;
use App\Runs\Execution\ExecutorReply;
use App\Runs\Execution\ReplyKind;
use App\Runs\RunLanguage;
use GuzzleHttp\Promise\PromiseInterface;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Request;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Tests\Support\AuditExecutorDouble;

beforeEach(function () {
    config(['runs.executor.url' => 'http://executor:8080', 'runs.executor.token' => 'a-token-of-at-least-thirty-two-bytes']);
    Http::preventStrayRequests();
});

it('reads a pooled response exactly as send() reads it', function (PromiseInterface $response, ReplyKind $kind, string $cause, ?int $status) {
    Http::fake(['*' => $response]);
    $client = app(ExecutorClient::class);

    $outcomes = Http::pool(fn (Pool $pool) => [
        $client->prepare($pool->as('only'))->post('/v1/run', ExecutorClient::body(RunLanguage::Rust, 'fn main() {}')),
    ]);
    $outcome = $outcomes['only'];
    $reply = $outcome instanceof Response || $outcome instanceof ConnectionException ? $client->read($outcome) : null;

    expect($reply)->toBeInstanceOf(ExecutorReply::class)
        ->and($reply?->kind)->toBe($kind)
        ->and($reply?->cause)->toBe($cause)
        ->and($reply?->httpStatus)->toBe($status);
})->with([
    'a valid result' => [fn () => Http::response(AuditExecutorDouble::result()), ReplyKind::Result, '', null],
    'busy' => [fn () => Http::response('ocupado', 503, ['Retry-After' => '7']), ReplyKind::Busy, '', null],
    'a sandbox failure' => [fn () => Http::response('falla', 500), ReplyKind::Failed, 'status', 500],
    'an invalid body' => [fn () => Http::response(AuditExecutorDouble::result(['extra' => 1])), ReplyKind::Failed, 'invalid_body', 200],
    'an unauthorized token' => [fn () => Http::response('token', 401), ReplyKind::Failed, 'status', 401],
]);

it('posts each pooled request with the token, as JSON, with exactly the language and the program', function () {
    Http::fake(['*' => Http::response(AuditExecutorDouble::result())]);
    $client = app(ExecutorClient::class);

    Http::pool(fn (Pool $pool) => [
        $client->prepare($pool->as('only'))->post('/v1/run', ExecutorClient::body(RunLanguage::Go, "package main\n")),
    ]);

    Http::assertSent(fn (Request $request) => $request->url() === 'http://executor:8080/v1/run'
        && $request->header('Authorization') === ['Bearer a-token-of-at-least-thirty-two-bytes']
        && str_starts_with($request->header('Content-Type')[0], 'application/json')
        && $request->data() === ['language' => 'go', 'program' => "package main\n"]);
});

it('reads a real refused connection inside a pool as NotReached, so the audit waits instead of giving up', function () {
    Http::allowStrayRequests();
    config(['runs.executor.url' => 'http://127.0.0.1:1', 'runs.executor.connect_timeout' => 2]);
    $client = app(ExecutorClient::class);

    $outcomes = Http::pool(fn (Pool $pool) => [
        $client->prepare($pool->as('only'))->post('/v1/run', ExecutorClient::body(RunLanguage::Rust, 'fn main() {}')),
    ]);

    expect($outcomes['only'])->toBeInstanceOf(ConnectionException::class)
        ->and($client->read($outcomes['only'])->kind)->toBe(ReplyKind::NotReached);
});
