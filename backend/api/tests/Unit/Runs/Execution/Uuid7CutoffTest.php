<?php

use App\Runs\Execution\Uuid7Cutoff;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;

it('gives the smallest UUIDv7 of an instant', function (string $instant, string $expected) {
    expect(Uuid7Cutoff::at(CarbonImmutable::parse($instant)))->toBe($expected);
})->with([
    'a round second' => ['2026-09-21T12:00:00.000Z', '01a0c3d6-5a00-7000-8000-000000000000'],
    'one millisecond later' => ['2026-09-21T12:00:00.001Z', '01a0c3d6-5a01-7000-8000-000000000000'],
]);

it('sorts after every UUIDv7 made before the instant and not after one made at or later', function () {
    mt_srand(20260921);
    for ($sample = 0; $sample < 1000; $sample++) {
        $instant = CarbonImmutable::createFromTimestampMsUTC(mt_rand(1_700_000_000_000, 1_900_000_000_000));

        $cutoff = Uuid7Cutoff::at($instant);

        expect((string) Str::uuid7(time: $instant->subMilliseconds(1)) < $cutoff)->toBeTrue()
            ->and((string) Str::uuid7(time: $instant) >= $cutoff)->toBeTrue()
            ->and((string) Str::uuid7(time: $instant->addMilliseconds(1)) >= $cutoff)->toBeTrue();
    }
});
