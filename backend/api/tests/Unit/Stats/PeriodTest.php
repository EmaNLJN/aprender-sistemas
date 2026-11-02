<?php

use App\Stats\Granularity;
use App\Stats\Period;
use Carbon\CarbonImmutable;

const BUENOS_AIRES = 'America/Argentina/Buenos_Aires';

function periodNow(): CarbonImmutable
{
    return CarbonImmutable::parse('2026-10-20 15:00:00', 'UTC');
}

it('takes the last thirty local days, today included, when no dates come', function () {
    $period = Period::of(null, null, null, periodNow(), BUENOS_AIRES, 30);

    expect($period->toMeta())->toBe(['from' => '2026-09-21', 'to' => '2026-10-20', 'granularity' => 'day', 'timezone' => BUENOS_AIRES])
        ->and($period->startsUtc())->toBe('2026-09-21 03:00:00.000')
        ->and($period->endsUtc())->toBe('2026-10-21 03:00:00.000')
        ->and($period->days())->toBe(30);
});

it('cuts each day at the local midnight', function () {
    $period = Period::of('2026-10-05', '2026-10-06', Granularity::Day, periodNow(), BUENOS_AIRES, 30);

    expect($period->buckets())->toBe([
        ['start' => '2026-10-05', 'startsUtc' => '2026-10-05 03:00:00.000', 'endsUtc' => '2026-10-06 03:00:00.000'],
        ['start' => '2026-10-06', 'startsUtc' => '2026-10-06 03:00:00.000', 'endsUtc' => '2026-10-07 03:00:00.000'],
    ])->and($period->bucketsJson())->toBe('[[0,"2026-10-05 03:00:00.000","2026-10-06 03:00:00.000"],[1,"2026-10-06 03:00:00.000","2026-10-07 03:00:00.000"]]')
        ->and($period->wholeJson())->toBe('[[0,"2026-10-05 03:00:00.000","2026-10-07 03:00:00.000"]]');
});

it('starts each week on Monday and clips the first and the last one to the period', function () {
    $period = Period::of('2026-10-01', '2026-10-20', Granularity::Week, periodNow(), BUENOS_AIRES, 30);

    expect(array_column($period->buckets(), 'start'))->toBe(['2026-10-01', '2026-10-05', '2026-10-12', '2026-10-19'])
        ->and($period->buckets()[3]['endsUtc'])->toBe('2026-10-21 03:00:00.000');
});

it('cuts each calendar month', function () {
    $period = Period::of('2026-09-15', '2026-11-02', Granularity::Month, periodNow(), BUENOS_AIRES, 30);

    expect($period->buckets())->toBe([
        ['start' => '2026-09-15', 'startsUtc' => '2026-09-15 03:00:00.000', 'endsUtc' => '2026-10-01 03:00:00.000'],
        ['start' => '2026-10-01', 'startsUtc' => '2026-10-01 03:00:00.000', 'endsUtc' => '2026-11-01 03:00:00.000'],
        ['start' => '2026-11-01', 'startsUtc' => '2026-11-01 03:00:00.000', 'endsUtc' => '2026-11-03 03:00:00.000'],
    ]);
});

it('gives a day of 23 hours when the zone moves its clock forward', function () {
    $period = Period::of('2026-03-08', '2026-03-08', Granularity::Day, periodNow(), 'America/New_York', 30);

    expect($period->buckets())->toBe([
        ['start' => '2026-03-08', 'startsUtc' => '2026-03-08 05:00:00.000', 'endsUtc' => '2026-03-09 04:00:00.000'],
    ]);
});

it('counts the days of the period inclusively', function () {
    expect(Period::of('2025-10-20', '2026-10-20', null, periodNow(), BUENOS_AIRES, 30)->days())->toBe(366)
        ->and(Period::of('2026-10-20', '2026-10-20', null, periodNow(), BUENOS_AIRES, 30)->days())->toBe(1);
});

it('keys the cache with the four values of the period', function () {
    expect(Period::of('2026-10-01', '2026-10-20', Granularity::Week, periodNow(), BUENOS_AIRES, 30)->cacheKey())
        ->toBe('2026-10-01|2026-10-20|week|'.BUENOS_AIRES);
});
