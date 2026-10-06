<?php

use App\Runs\Evidence\EvidenceReader;
use App\Runs\Evidence\ExecutorResult;
use App\Runs\Evidence\ExpectedEvidence;
use App\Runs\Evidence\ResultClassifier;
use App\Runs\Evidence\Verdict;
use App\Runs\ExecutorPhase;
use App\Runs\RunReason;
use App\Runs\RunStatus;

function batteryOutput(string $nonce, array $keys = ['t1', 't2', 't3'], string $outcome = 'PASS', ?int $count = null): string
{
    $out = '';
    foreach ($keys as $key) {
        $out .= "__TALLER_TEST__{$nonce}:{$key}:{$outcome}\n";
    }

    return $out."__TALLER_END__{$nonce}:".($count ?? count($keys))."\n";
}

function batteryVerdict(string $stdout, int $exitCode = 0, bool $truncated = false): Verdict
{
    $result = new ExecutorResult(ExecutorPhase::Run, $exitCode, $stdout, '', $truncated, false, false, 1, 1);
    $expected = new ExpectedEvidence('0123456789abcdef0123456789abcdef', ['t1', 't2', 't3'], false);

    return (new ResultClassifier(new EvidenceReader, 'runsc'))->classify($result, $expected);
}

const REAL_NONCE = '0123456789abcdef0123456789abcdef';

it('controls the battery: the right nonce, all tests and the right sentinel pass', function () {
    expect(batteryVerdict(batteryOutput(REAL_NONCE))->status)->toBe(RunStatus::Passed);
});

it('never passes any of the eight attack programs (SC-002)', function (string $stdout, int $exitCode, bool $truncated, RunStatus $status, ?RunReason $reason) {
    $verdict = batteryVerdict($stdout, $exitCode, $truncated);

    expect($verdict->status)->not->toBe(RunStatus::Passed)
        ->and($verdict->status)->toBe($status)
        ->and($verdict->reason)->toBe($reason);
})->with([
    '1 invented nonce' => [batteryOutput('ffffffffffffffffffffffffffffffff'), 0, false, RunStatus::Failed, RunReason::EvidenceInvalid],
    '2 repeated marker' => ["__TALLER_TEST__0123456789abcdef0123456789abcdef:t1:PASS\n".batteryOutput(REAL_NONCE), 0, false, RunStatus::Failed, RunReason::EvidenceInvalid],
    '3 an extra test that does not exist' => [batteryOutput(REAL_NONCE, ['t1', 't2', 't3', 't4'], 'PASS', 3), 0, false, RunStatus::Failed, RunReason::EvidenceInvalid],
    '4 sentinel absent' => ["__TALLER_TEST__0123456789abcdef0123456789abcdef:t1:PASS\n__TALLER_TEST__0123456789abcdef0123456789abcdef:t2:PASS\n__TALLER_TEST__0123456789abcdef0123456789abcdef:t3:PASS\n", 0, false, RunStatus::Failed, RunReason::EvidenceInvalid],
    '5 sentinel count does not match' => [batteryOutput(REAL_NONCE, ['t1', 't2', 't3'], 'PASS', 99), 0, false, RunStatus::Failed, RunReason::EvidenceInvalid],
    '6 empty output with code 0' => ['', 0, false, RunStatus::Failed, RunReason::EvidenceInvalid],
    '7 padding that truncates the evidence' => [str_repeat('x', 65536), 0, true, RunStatus::Failed, RunReason::OutputLimit],
    '8 every marker PASS with exit code 1' => [batteryOutput(REAL_NONCE), 1, false, RunStatus::RuntimeError, null],
]);
