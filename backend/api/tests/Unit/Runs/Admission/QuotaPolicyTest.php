<?php

use App\Runs\Admission\QuotaKind;
use App\Runs\Admission\QuotaPolicy;
use App\Runs\Admission\QuotaUsage;
use App\Runs\Admission\Rejection;
use App\Runs\Admission\RejectionKind;
use App\Runs\Record\Instant;
use Carbon\CarbonImmutable;
use Tests\TestCase;

uses(TestCase::class);

function quotaNow(): CarbonImmutable
{
    return Instant::parse('2026-10-05 12:00:00.000');
}

function quotaUsage(
    int $active = 0,
    int $lastMinute = 0,
    ?CarbonImmutable $oldestInMinute = null,
    int $lastDay = 0,
    ?CarbonImmutable $oldestInDay = null,
    int $sandboxMs = 0,
    ?CarbonImmutable $oldestSandbox = null,
): QuotaUsage {
    return new QuotaUsage($active, $lastMinute, $oldestInMinute, $lastDay, $oldestInDay, $sandboxMs, $oldestSandbox);
}

it('accepts an account that is under every quota', function () {
    $usage = quotaUsage(lastMinute: 9, oldestInMinute: quotaNow()->subSeconds(50), lastDay: 299, oldestInDay: quotaNow()->subHours(5), sandboxMs: 1_799_999);

    expect((new QuotaPolicy)->check($usage, quotaNow()))->toBeNull();
});

it('rejects a second active run and asks to retry in 3 seconds', function () {
    $rejection = (new QuotaPolicy)->check(quotaUsage(active: 1), quotaNow());

    expect($rejection)->toBeInstanceOf(Rejection::class)
        ->and($rejection->kind)->toBe(RejectionKind::Quota)
        ->and($rejection->quota)->toBe(QuotaKind::Active)
        ->and($rejection->retryAfterSeconds)->toBe(3);
});

it('rejects the eleventh run of a minute until the oldest of them leaves the window', function () {
    $usage = quotaUsage(lastMinute: 10, oldestInMinute: quotaNow()->subSeconds(50));

    $rejection = (new QuotaPolicy)->check($usage, quotaNow());

    expect($rejection->quota)->toBe(QuotaKind::PerMinute)
        ->and($rejection->retryAfterSeconds)->toBe(10);
});

it('never asks to retry in less than one second', function () {
    $usage = quotaUsage(lastMinute: 10, oldestInMinute: quotaNow()->subMilliseconds(59_900));

    expect((new QuotaPolicy)->check($usage, quotaNow())->retryAfterSeconds)->toBe(1);
});

it('rejects past 300 runs in the day and counts the wait from the oldest of them', function () {
    $usage = quotaUsage(lastDay: 300, oldestInDay: quotaNow()->subHours(23));

    $rejection = (new QuotaPolicy)->check($usage, quotaNow());

    expect($rejection->quota)->toBe(QuotaKind::PerDay)
        ->and($rejection->retryAfterSeconds)->toBe(3600);
});

it('rejects at 30 minutes of sandbox time and not one millisecond before', function () {
    $oldest = quotaNow()->subHours(1);

    $atLimit = (new QuotaPolicy)->check(quotaUsage(sandboxMs: 1_800_000, oldestSandbox: $oldest), quotaNow());
    $below = (new QuotaPolicy)->check(quotaUsage(sandboxMs: 1_799_999, oldestSandbox: $oldest), quotaNow());

    expect($atLimit->quota)->toBe(QuotaKind::SandboxTime)
        ->and($atLimit->retryAfterSeconds)->toBe(82_800)
        ->and($below)->toBeNull();
});

it('reports the first quota that is passed, in the order active, per minute, per day, sandbox time', function () {
    $usage = quotaUsage(
        active: 1,
        lastMinute: 10, oldestInMinute: quotaNow()->subSeconds(5),
        lastDay: 300, oldestInDay: quotaNow()->subHours(1),
        sandboxMs: 1_800_000, oldestSandbox: quotaNow()->subHours(1),
    );
    $withoutActive = quotaUsage(
        lastMinute: 10, oldestInMinute: quotaNow()->subSeconds(5),
        lastDay: 300, oldestInDay: quotaNow()->subHours(1),
        sandboxMs: 1_800_000, oldestSandbox: quotaNow()->subHours(1),
    );
    $withoutMinute = quotaUsage(lastDay: 300, oldestInDay: quotaNow()->subHours(1), sandboxMs: 1_800_000, oldestSandbox: quotaNow()->subHours(1));

    expect((new QuotaPolicy)->check($usage, quotaNow())->quota)->toBe(QuotaKind::Active)
        ->and((new QuotaPolicy)->check($withoutActive, quotaNow())->quota)->toBe(QuotaKind::PerMinute)
        ->and((new QuotaPolicy)->check($withoutMinute, quotaNow())->quota)->toBe(QuotaKind::PerDay);
});

it('takes every limit from the configuration', function () {
    config(['runs.quota.per_minute' => 2, 'runs.quota.sandbox_minutes_per_day' => 1, 'runs.quota.active' => 3]);

    $perMinute = (new QuotaPolicy)->check(quotaUsage(lastMinute: 2, oldestInMinute: quotaNow()->subSeconds(10)), quotaNow());
    $sandbox = (new QuotaPolicy)->check(quotaUsage(sandboxMs: 60_000, oldestSandbox: quotaNow()->subSeconds(10)), quotaNow());
    $active = (new QuotaPolicy)->check(quotaUsage(active: 2), quotaNow());

    expect($perMinute->quota)->toBe(QuotaKind::PerMinute)
        ->and($sandbox->quota)->toBe(QuotaKind::SandboxTime)
        ->and($active)->toBeNull();
});

it('says the queue is full from 32 waiting runs and asks to retry in 10 seconds', function () {
    $full = (new QuotaPolicy)->checkQueue(32);

    expect($full->kind)->toBe(RejectionKind::QueueFull)
        ->and($full->quota)->toBeNull()
        ->and($full->retryAfterSeconds)->toBe(10)
        ->and((new QuotaPolicy)->checkQueue(31))->toBeNull();
});

it('reads the size of the queue from the configuration', function () {
    config(['runs.queue.max_waiting' => 2, 'runs.queue.retry_after_full' => 7]);

    expect((new QuotaPolicy)->checkQueue(2)->retryAfterSeconds)->toBe(7)
        ->and((new QuotaPolicy)->checkQueue(1))->toBeNull();
});
