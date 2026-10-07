<?php

use App\Support\Iso8601;
use Illuminate\Support\Carbon;

it('formats an instant in UTC with milliseconds', function (Carbon $instant) {
    expect(Iso8601::utc($instant))->toBe('2026-10-12T15:30:00.123Z');
})->with([
    'in UTC' => fn () => Carbon::parse('2026-10-12 15:30:00.123456', 'UTC'),
    'in -03:00' => fn () => Carbon::parse('2026-10-12 12:30:00.123456', '-03:00'),
]);

it('does not change the timezone of the instant it receives', function () {
    $instant = Carbon::parse('2026-10-12 12:30:00', '-03:00');

    Iso8601::utc($instant);

    expect($instant->format('P'))->toBe('-03:00');
});
