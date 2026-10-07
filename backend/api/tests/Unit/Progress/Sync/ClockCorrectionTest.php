<?php

use App\Progress\Sync\ClockCorrection;
use Carbon\CarbonImmutable;

function clockAt(string $iso): CarbonImmutable
{
    return CarbonImmutable::parse($iso)->utc();
}

function effectiveIso(string $at, string $sentAt, string $now = '2026-10-05T12:10:00.000Z'): string
{
    return ClockCorrection::effective(clockAt($at), clockAt($sentAt), clockAt($now))->format('Y-m-d\TH:i:s.v\Z');
}

it('keeps the clock of a device that is in sync', function () {
    expect(effectiveIso('2026-10-05T12:09:58.000Z', '2026-10-05T12:10:00.000Z'))->toBe('2026-10-05T12:09:58.000Z');
});

it('moves back the clock of a device that is one hour ahead', function () {
    expect(effectiveIso('2026-10-05T13:09:55.000Z', '2026-10-05T13:10:00.000Z'))->toBe('2026-10-05T12:09:55.000Z');
});

it('moves forward the clock of a device that is one hour behind', function () {
    expect(effectiveIso('2026-10-05T11:09:55.000Z', '2026-10-05T11:10:00.000Z'))->toBe('2026-10-05T12:09:55.000Z');
});

it('caps an operation dated after the send at the time of the server', function () {
    expect(effectiveIso('2026-10-05T12:10:10.000Z', '2026-10-05T12:10:00.000Z'))->toBe('2026-10-05T12:10:00.000Z');
});

it('keeps the age of an operation that waited days offline', function () {
    expect(effectiveIso('2026-10-02T12:10:00.000Z', '2026-10-05T12:10:00.000Z'))->toBe('2026-10-02T12:10:00.000Z');
});

it('does not correct to a time before the floor an operation that was already older', function () {
    expect(effectiveIso('2019-12-31T23:59:59.000Z', '2026-10-05T12:10:00.000Z'))->toBe('2019-12-31T23:59:59.000Z');
});

it('keeps milliseconds', function () {
    expect(effectiveIso('2026-10-05T12:09:59.250Z', '2026-10-05T12:10:00.100Z', '2026-10-05T12:10:00.600Z'))->toBe('2026-10-05T12:09:59.750Z');
});

it('reports the offset of the batch in milliseconds, positive when the device is behind', function (string $sentAt, int $offset) {
    expect(ClockCorrection::offsetMs(clockAt($sentAt), clockAt('2026-10-05T12:10:00.000Z')))->toBe($offset);
})->with([
    'in sync' => ['2026-10-05T12:10:00.000Z', 0],
    'one hour ahead' => ['2026-10-05T13:10:00.000Z', -3600000],
    'one hour behind' => ['2026-10-05T11:10:00.000Z', 3600000],
    'half a second behind' => ['2026-10-05T12:09:59.500Z', 500],
]);

it('bounds the offset to the range of an INT column', function (string $sentAt, int $offset) {
    expect(ClockCorrection::offsetMs(clockAt($sentAt), clockAt('2026-10-05T12:10:00.000Z')))->toBe($offset);
})->with([
    'a device years behind' => ['2020-01-01T00:00:00.000Z', 2147483647],
    'a device years ahead' => ['2036-01-01T00:00:00.000Z', -2147483648],
    'exactly the upper bound' => ['2026-09-10T15:38:36.353Z', 2147483647],
    'exactly the lower bound' => ['2026-10-30T08:41:23.648Z', -2147483648],
]);
