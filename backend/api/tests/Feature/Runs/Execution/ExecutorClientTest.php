<?php

use App\Runs\Execution\ExecutorClient;
use App\Runs\Execution\ReplyKind;
use App\Runs\ExecutorPhase;
use App\Runs\RunLanguage;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Psr7\Request as PsrRequest;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

const EXECUTOR_TOKEN_FOR_TESTS = 'a-token-of-at-least-thirty-two-bytes';

/** @return array<string, mixed> */
function executorBody(array $changes = []): array
{
    return [
        'phase' => 'run', 'exitCode' => 0, 'stdout' => 'out', 'stderr' => 'err', 'truncated' => false, 'timedOut' => false,
        'oomKilled' => false, 'compileMs' => 412, 'runMs' => 31, ...$changes,
    ];
}

function connectionFailureWithErrno(?int $errno, ?ArrayObject $calls = null): Closure
{
    return function () use ($errno, $calls): never {
        $calls?->append(true);
        $message = $errno === null ? 'The connection failed' : "cURL error {$errno}: The connection failed (see https://curl.se/libcurl/c/libcurl-errors.html)";

        throw new ConnectionException($message, 0, new ConnectException($message, new PsrRequest('POST', 'http://executor:8080/v1/run')));
    };
}

beforeEach(function () {
    config(['runs.executor.url' => 'http://executor:8080', 'runs.executor.token' => EXECUTOR_TOKEN_FOR_TESTS]);
    Http::preventStrayRequests();
});

it('reads a valid 200 as a Result with the nine fields', function () {
    Http::fake(['*' => Http::response(executorBody())]);

    $reply = app(ExecutorClient::class)->send(RunLanguage::Rust, 'fn main() {}');

    expect($reply->kind)->toBe(ReplyKind::Result)
        ->and($reply->result?->phase)->toBe(ExecutorPhase::Run)
        ->and($reply->result?->exitCode)->toBe(0)
        ->and($reply->result?->stdout)->toBe('out')
        ->and($reply->result?->stderr)->toBe('err')
        ->and($reply->result?->compileMs)->toBe(412)
        ->and($reply->result?->runMs)->toBe(31);
    Http::assertSentCount(1);
});

it('reads a 503 as Busy with the Retry-After it carries, or 1', function (array $headers, int $expected) {
    Http::fake(['*' => Http::response('busy', 503, $headers)]);

    $reply = app(ExecutorClient::class)->send(RunLanguage::Go, 'package main');

    expect($reply->kind)->toBe(ReplyKind::Busy)
        ->and($reply->retryAfterSeconds)->toBe($expected);
    Http::assertSentCount(1);
})->with([
    'a number of seconds' => [['Retry-After' => '7'], 7],
    'no header' => [[], 1],
    'a date' => [['Retry-After' => 'Wed, 21 Oct 2026 07:28:00 GMT'], 1],
    'a negative number' => [['Retry-After' => '-3'], 1],
    'an empty value' => [['Retry-After' => ''], 1],
]);

it('reads a refused connection and a name that does not resolve as NotReached', function (int $errno) {
    Http::fake(['*' => connectionFailureWithErrno($errno)]);

    $reply = app(ExecutorClient::class)->send(RunLanguage::Rust, 'fn main() {}');

    expect($reply->kind)->toBe(ReplyKind::NotReached);
})->with([
    'connection refused' => [7],
    'could not resolve host' => [6],
]);

it('does not take a connection error as proof that the code never ran, and does not retry it', function (?int $errno) {
    $calls = new ArrayObject;
    Http::fake(['*' => connectionFailureWithErrno($errno, $calls)]);

    $reply = app(ExecutorClient::class)->send(RunLanguage::Rust, 'fn main() {}');

    expect($reply->kind)->toBe(ReplyKind::Failed)
        ->and($reply->cause)->toBe('connection')
        ->and($reply->httpStatus)->toBeNull()
        ->and($calls)->toHaveCount(1);
})->with([
    'no errno' => [null],
    'timeout' => [28],
    'connection cut' => [56],
    'empty reply' => [52],
]);

it('reads a real refused connection and a real unresolvable name as NotReached', function (string $url) {
    Http::allowStrayRequests();
    config(['runs.executor.url' => $url, 'runs.executor.connect_timeout' => 2]);

    $reply = app(ExecutorClient::class)->send(RunLanguage::Rust, 'fn main() {}');

    expect($reply->kind)->toBe(ReplyKind::NotReached);
})->with([
    'a closed port' => ['http://127.0.0.1:1'],
    'a name that does not exist' => ['http://executor.invalid:8080'],
]);

it('reads a connection exception without a Guzzle cause as Failed', function () {
    Http::fake(['*' => fn () => throw new ConnectionException('boom')]);

    $reply = app(ExecutorClient::class)->send(RunLanguage::Rust, 'fn main() {}');

    expect($reply->kind)->toBe(ReplyKind::Failed)
        ->and($reply->cause)->toBe('connection');
});

it('reads any other status as Failed with its status and sends one request only', function (int $status) {
    Http::fake(['*' => Http::response('nope', $status)]);

    $reply = app(ExecutorClient::class)->send(RunLanguage::Rust, 'fn main() {}');

    expect($reply->kind)->toBe(ReplyKind::Failed)
        ->and($reply->cause)->toBe('status')
        ->and($reply->httpStatus)->toBe($status);
    Http::assertSentCount(1);
})->with([500, 400, 401, 413, 418]);

it('reads a 200 whose body is not a valid result as Failed invalid_body', function (mixed $body) {
    Http::fake(['*' => Http::response($body)]);

    $reply = app(ExecutorClient::class)->send(RunLanguage::Rust, 'fn main() {}');

    expect($reply->kind)->toBe(ReplyKind::Failed)
        ->and($reply->cause)->toBe('invalid_body')
        ->and($reply->httpStatus)->toBe(200);
    Http::assertSentCount(1);
})->with([
    'a missing field' => [fn () => array_diff_key(executorBody(), ['runMs' => 1])],
    'an extra field' => [fn () => executorBody(['extra' => 1])],
    'a wrong type' => [fn () => executorBody(['exitCode' => '0'])],
    'compile phase with code 0' => [fn () => executorBody(['phase' => 'compile', 'exitCode' => 0])],
    'an out of range integer' => [fn () => executorBody(['runMs' => 4294967296])],
    'text that is not JSON' => ['this is not json'],
]);

it('posts to the executor with its token and exactly the language and the program, byte by byte', function () {
    Http::fake(['*' => Http::response(executorBody())]);
    $program = "fn main() {\n    println!(\"{{code}} ñandú → 日本\");\r\n}\n";

    app(ExecutorClient::class)->send(RunLanguage::Rust, $program);

    Http::assertSent(function (Request $request) use ($program) {
        return $request->method() === 'POST'
            && $request->url() === 'http://executor:8080/v1/run'
            && $request->header('Authorization') === ['Bearer '.EXECUTOR_TOKEN_FOR_TESTS]
            && str_starts_with($request->header('Content-Type')[0], 'application/json')
            && $request->data() === ['language' => 'rust', 'program' => $program];
    });
});

it('sends the language of the run as the executor names it', function () {
    Http::fake(['*' => Http::response(executorBody())]);

    app(ExecutorClient::class)->send(RunLanguage::Go, 'package main');

    Http::assertSent(fn (Request $request) => $request->data()['language'] === 'go');
});

it('fails the job when the executor token is not configured', function () {
    config(['runs.executor.token' => null]);
    Http::fake();

    expect(fn () => app(ExecutorClient::class)->send(RunLanguage::Rust, 'fn main() {}'))->toThrow(InvalidArgumentException::class);
    Http::assertNothingSent();
});
