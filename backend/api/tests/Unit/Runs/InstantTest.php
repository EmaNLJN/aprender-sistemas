<?php

use App\Runs\Record\Instant;
use Carbon\CarbonImmutable;
use Tests\TestCase;

uses(TestCase::class);

it('formats an instant as the DATETIME(3) text of MySQL', function () {
    $at = CarbonImmutable::parse('2026-10-05T12:00:00.123Z');

    expect(Instant::format($at))->toBe('2026-10-05 12:00:00.123');
});

it('formats in UTC whatever the zone of the instant', function () {
    $at = CarbonImmutable::parse('2026-10-05T09:00:00.500-03:00');

    expect(Instant::format($at))->toBe('2026-10-05 12:00:00.500');
});

it('parses a DATETIME(3) back to the same instant, in UTC', function () {
    $at = Instant::parse('2026-10-05 12:00:00.123');

    expect($at->getTimezone()->getName())->toBe('UTC')
        ->and(Instant::iso($at))->toBe('2026-10-05T12:00:00.123Z')
        ->and(Instant::format($at))->toBe('2026-10-05 12:00:00.123');
});

it('rejects text that is not a DATETIME(3)', function () {
    Instant::parse('2026-10-05T12:00:00Z');
})->throws(LogicException::class);

it('parses null as null', function () {
    expect(Instant::parseOrNull(null))->toBeNull()
        ->and(Instant::parseOrNull('2026-10-05 12:00:00.000'))->toBeInstanceOf(CarbonImmutable::class);
});

it('gives the frozen clock of the test as now, in UTC', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-05T12:00:00.250Z'));

    expect(Instant::format(Instant::now()))->toBe('2026-10-05 12:00:00.250')
        ->and(Instant::now()->getTimezone()->getName())->toBe('UTC');
});

it('counts whole seconds up, never less than one', function (string $from, string $to, int $seconds) {
    expect(Instant::secondsUntil(Instant::parse($from), Instant::parse($to)))->toBe($seconds);
})->with([
    'two tenths of a second' => ['2026-10-05 12:00:00.000', '2026-10-05 12:00:00.200', 1],
    'two point one seconds' => ['2026-10-05 12:00:00.000', '2026-10-05 12:00:02.100', 3],
    'one minute' => ['2026-10-05 12:00:00.000', '2026-10-05 12:01:00.000', 60],
    'already past' => ['2026-10-05 12:00:05.000', '2026-10-05 12:00:00.000', 1],
]);
