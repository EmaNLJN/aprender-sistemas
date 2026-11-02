<?php

use App\Mail\MailDeadline;
use Carbon\CarbonImmutable;
use Tests\TestCase;

uses(TestCase::class);

function queuedAtNoon(): CarbonImmutable
{
    return CarbonImmutable::parse('2026-10-12 12:00:00', 'UTC');
}

it('stops retrying when a short link expires', function () {
    config(['taller.mail.retry_seconds' => 86400]);

    $deadline = MailDeadline::for(queuedAtNoon(), CarbonImmutable::parse('2026-10-12 13:00:00', 'UTC'));

    expect($deadline->toIso8601String())->toBe('2026-10-12T13:00:00+00:00');
});

it('stops retrying after 24 hours when the link lasts seven days', function () {
    config(['taller.mail.retry_seconds' => 86400]);

    $deadline = MailDeadline::for(queuedAtNoon(), CarbonImmutable::parse('2026-10-19 12:00:00', 'UTC'));

    expect($deadline->toIso8601String())->toBe('2026-10-13T12:00:00+00:00');
});

it('uses the retry window alone for a mail without a link', function () {
    config(['taller.mail.retry_seconds' => 86400]);

    expect(MailDeadline::for(queuedAtNoon(), null)->toIso8601String())->toBe('2026-10-13T12:00:00+00:00');
});

it('follows the configured retry window', function () {
    config(['taller.mail.retry_seconds' => 20]);

    expect(MailDeadline::for(queuedAtNoon(), null)->toIso8601String())->toBe('2026-10-12T12:00:20+00:00');
});
