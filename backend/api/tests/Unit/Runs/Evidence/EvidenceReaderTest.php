<?php

use App\Runs\Evidence\Evidence;
use App\Runs\Evidence\EvidenceReader;
use App\Runs\Evidence\ExpectedEvidence;
use App\Runs\TestOutcome;

const NONCE = '0123456789abcdef0123456789abcdef';

function marker(string $key, string $outcome, string $nonce = NONCE): string
{
    return "__TALLER_TEST__{$nonce}:{$key}:{$outcome}\n";
}

function sentinel(int $count, string $nonce = NONCE): string
{
    return "__TALLER_END__{$nonce}:{$count}\n";
}

/** @return list<string> */
function outcomesOf(array $tests): array
{
    $outcomes = [];
    foreach ($tests as $verdict) {
        $outcomes[] = $verdict->key.'='.$verdict->outcome->value;
    }

    return $outcomes;
}

function readEvidence(string $stdout, array $keys = ['t1', 't2', 't3'], bool $custom = false): Evidence
{
    return (new EvidenceReader)->read($stdout, new ExpectedEvidence(NONCE, $keys, $custom));
}

it('reads complete evidence of three passing tests', function () {
    $evidence = readEvidence(marker('t1', 'PASS').marker('t2', 'PASS').marker('t3', 'PASS').sentinel(3));

    expect($evidence->complete)->toBeTrue()
        ->and(outcomesOf($evidence->tests))->toBe(['t1=pass', 't2=pass', 't3=pass'])
        ->and($evidence->custom)->toBeNull();
});

it('reads a failing test as fail and the evidence stays complete', function () {
    $evidence = readEvidence(marker('t1', 'PASS').marker('t2', 'FAIL').marker('t3', 'PASS').sentinel(3));

    expect($evidence->complete)->toBeTrue()
        ->and(outcomesOf($evidence->tests))->toBe(['t1=pass', 't2=fail', 't3=pass']);
});

it('marks a test without a marker as missing and the evidence incomplete', function () {
    $evidence = readEvidence(marker('t1', 'PASS').marker('t3', 'PASS').sentinel(3));

    expect($evidence->complete)->toBeFalse()
        ->and(outcomesOf($evidence->tests))->toBe(['t1=pass', 't2=missing', 't3=pass']);
});

it('marks a repeated marker as missing and the evidence incomplete', function () {
    $evidence = readEvidence(marker('t1', 'PASS').marker('t2', 'PASS').marker('t2', 'PASS').marker('t3', 'PASS').sentinel(3));

    expect($evidence->complete)->toBeFalse()
        ->and(outcomesOf($evidence->tests))->toBe(['t1=pass', 't2=missing', 't3=pass']);
});

it('does not count a marker with another nonce', function () {
    $forged = marker('t2', 'PASS', 'ffffffffffffffffffffffffffffffff');
    $evidence = readEvidence(marker('t1', 'PASS').$forged.marker('t3', 'PASS').sentinel(3));

    expect($evidence->complete)->toBeFalse()
        ->and(outcomesOf($evidence->tests))->toBe(['t1=pass', 't2=missing', 't3=pass']);
});

it('makes the evidence incomplete when a marker carries a key that was not expected', function () {
    $evidence = readEvidence(marker('t1', 'PASS').marker('t2', 'PASS').marker('t3', 'PASS').marker('t4', 'PASS').sentinel(3));

    expect($evidence->complete)->toBeFalse()
        ->and(outcomesOf($evidence->tests))->toBe(['t1=pass', 't2=pass', 't3=pass']);
});

it('makes the evidence incomplete when the sentinel is absent, repeated or counts wrong', function (string $sentinels) {
    $evidence = readEvidence(marker('t1', 'PASS').marker('t2', 'PASS').marker('t3', 'PASS').$sentinels);

    expect($evidence->complete)->toBeFalse();
})->with([
    'absent' => [''],
    'repeated' => [sentinel(3).sentinel(3)],
    'wrong count' => [sentinel(2)],
    'with another nonce' => [sentinel(3, 'ffffffffffffffffffffffffffffffff')],
]);

it('reads a custom test that was sent and is present as pass or fail', function (string $outcome, TestOutcome $expected) {
    $stdout = marker('t1', 'PASS').marker('custom', $outcome).sentinel(2);

    $evidence = readEvidence($stdout, ['t1'], true);

    expect($evidence->complete)->toBeTrue()
        ->and($evidence->custom)->toBe($expected);
})->with([
    'pass' => ['PASS', TestOutcome::Pass],
    'fail' => ['FAIL', TestOutcome::Fail],
]);

it('makes the evidence incomplete when a custom test was sent and is absent', function () {
    $evidence = readEvidence(marker('t1', 'PASS').sentinel(2), ['t1'], true);

    expect($evidence->complete)->toBeFalse()
        ->and($evidence->custom)->toBe(TestOutcome::Missing);
});

it('does not expect a custom test that was not sent, and a marker for it breaks the evidence', function () {
    $clean = readEvidence(marker('t1', 'PASS').sentinel(1), ['t1']);
    $withCustom = readEvidence(marker('t1', 'PASS').marker('custom', 'PASS').sentinel(1), ['t1']);

    expect($clean->complete)->toBeTrue()
        ->and($clean->custom)->toBeNull()
        ->and($withCustom->complete)->toBeFalse();
});

it('counts a marker glued to output without a line break', function () {
    $evidence = readEvidence('hola'.marker('t1', 'PASS').sentinel(1), ['t1']);

    expect($evidence->complete)->toBeTrue()
        ->and(outcomesOf($evidence->tests))->toBe(['t1=pass']);
});

it('does not read a marker whose outcome continues into more word characters', function () {
    $evidence = readEvidence(marker('t1', 'PASSED').sentinel(1), ['t1']);

    expect($evidence->complete)->toBeFalse()
        ->and(outcomesOf($evidence->tests))->toBe(['t1=missing']);
});

it('reads a key made of digits without turning it into an integer', function () {
    $evidence = readEvidence(marker('123', 'PASS').marker('t2', 'FAIL').sentinel(2), ['123', 't2']);

    expect($evidence->complete)->toBeTrue()
        ->and(outcomesOf($evidence->tests))->toBe(['123=pass', 't2=fail']);
});
