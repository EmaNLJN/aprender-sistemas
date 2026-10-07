<?php

use App\Runs\Evidence\ExecutorResult;
use App\Runs\ExecutorPhase;

/** @return array<string, mixed> the example response of contracts/executor.md */
function executorPayload(array $overrides = []): array
{
    return [
        'phase' => 'run', 'exitCode' => 0, 'stdout' => '…', 'stderr' => '…', 'truncated' => false,
        'timedOut' => false, 'oomKilled' => false, 'compileMs' => 412, 'runMs' => 31,
        ...$overrides,
    ];
}

it('builds a result from the example of the contract', function () {
    $result = ExecutorResult::fromPayload(executorPayload());

    expect($result)->toBeInstanceOf(ExecutorResult::class)
        ->and($result->phase)->toBe(ExecutorPhase::Run)
        ->and($result->exitCode)->toBe(0)
        ->and($result->stdout)->toBe('…')
        ->and($result->stderr)->toBe('…')
        ->and($result->truncated)->toBeFalse()
        ->and($result->timedOut)->toBeFalse()
        ->and($result->oomKilled)->toBeFalse()
        ->and($result->compileMs)->toBe(412)
        ->and($result->runMs)->toBe(31);
});

it('accepts a failed compilation, which the executor does produce', function () {
    $result = ExecutorResult::fromPayload(executorPayload(['phase' => 'compile', 'exitCode' => 1, 'runMs' => 0]));

    expect($result?->phase)->toBe(ExecutorPhase::Compile);
});

it('accepts the limits of the integer ranges', function () {
    $result = ExecutorResult::fromPayload(executorPayload(['exitCode' => -32768, 'compileMs' => 0, 'runMs' => 4294967295]));
    $high = ExecutorResult::fromPayload(executorPayload(['exitCode' => 32767]));

    expect($result?->exitCode)->toBe(-32768)
        ->and($result?->runMs)->toBe(4294967295)
        ->and($high?->exitCode)->toBe(32767);
});

it('accepts a compile phase with exit code 0 when it timed out or ran out of memory', function (string $flag) {
    expect(ExecutorResult::fromPayload(executorPayload(['phase' => 'compile', 'exitCode' => 0, $flag => true])))->not->toBeNull();
})->with(['timedOut', 'oomKilled']);

it('is not a valid result', function (array $payload) {
    expect(ExecutorResult::fromPayload($payload))->toBeNull();
})->with(function () {
    $withoutPhase = executorPayload();
    unset($withoutPhase['phase']);

    return [
        'a field is missing' => [$withoutPhase],
        'an extra field' => [executorPayload(['extra' => 1])],
        'unknown phase' => [executorPayload(['phase' => 'link'])],
        'phase is not text' => [executorPayload(['phase' => 1])],
        'exitCode is text' => [executorPayload(['exitCode' => '0'])],
        'exitCode is a float' => [executorPayload(['exitCode' => 1.5])],
        'exitCode below SMALLINT' => [executorPayload(['exitCode' => -32769])],
        'exitCode above SMALLINT' => [executorPayload(['exitCode' => 32768])],
        'compileMs is text' => [executorPayload(['compileMs' => '412'])],
        'runMs is a float' => [executorPayload(['runMs' => 31.5])],
        'compileMs is negative' => [executorPayload(['compileMs' => -1])],
        'runMs above INT UNSIGNED' => [executorPayload(['runMs' => 4294967296])],
        'stdout is not text' => [executorPayload(['stdout' => ['a']])],
        'stderr is null' => [executorPayload(['stderr' => null])],
        'truncated is 0' => [executorPayload(['truncated' => 0])],
        'timedOut is "false"' => [executorPayload(['timedOut' => 'false'])],
        'oomKilled is 1' => [executorPayload(['oomKilled' => 1])],
        'compile phase that exited 0 without timeout or memory' => [executorPayload(['phase' => 'compile', 'exitCode' => 0])],
    ];
});

it('is not a valid result when the body is not an object', function (mixed $payload) {
    expect(ExecutorResult::fromPayload($payload))->toBeNull();
})->with(['null' => [null], 'text' => ['ok'], 'empty list' => [[]], 'a list' => [[1, 2, 3]]]);
