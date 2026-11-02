<?php

use App\Auth\Invitations;
use App\Auth\IssuedInvitation;
use App\Auth\IssuedResetLink;
use App\Auth\Role;
use App\Jobs\SendMail;
use App\Mail\OutgoingMail;
use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\Support\FailingTransport;
use Tests\Support\MailWorld;

const FAILURE_START = '2026-10-12 12:00:00';

beforeEach(function () {
    MailWorld::available();
    MailWorld::onDatabaseQueue();
    FailingTransport::install();
    $this->travelTo(CarbonImmutable::parse(FAILURE_START, 'UTC'));
    $this->handler = MailWorld::captureLogs();
});

afterEach(fn () => FailingTransport::reset());

function queueFailingInvitation(): IssuedInvitation
{
    $issued = app(Invitations::class)->issue('ana@x.com', Role::Student, null);
    SendMail::dispatch(OutgoingMail::invitation($issued));

    return $issued;
}

function nextAvailableAt(): int
{
    return (int) DB::table('mail_jobs')->value('available_at');
}

it('retries after 60 seconds and keeps the invitation unmarked while it waits', function () {
    $issued = queueFailingInvitation();

    MailWorld::runWorker();

    $job = DB::table('mail_jobs')->first();
    $row = DB::table('invitations')->where('id', $issued->invitation->id)->first(['sent_at', 'send_failed_at']);
    $attempt = MailWorld::recordsNamed($this->handler, 'mail.attempt_failed');
    expect($job->available_at)->toBe(Carbon::parse(FAILURE_START, 'UTC')->getTimestamp() + 60)
        ->and($job->attempts)->toBe(1)
        ->and($attempt)->toHaveCount(1)
        ->and($attempt[0]->context['cause'])->toBe('TransportException 0')
        ->and($attempt[0]->context['attempt'])->toBe(1)
        ->and($row->sent_at)->toBeNull()
        ->and($row->send_failed_at)->toBeNull();
});

it('spaces the next attempts by 300, 900, 3600 and 3600 seconds', function () {
    queueFailingInvitation();
    $start = Carbon::parse(FAILURE_START, 'UTC')->getTimestamp();
    MailWorld::runWorker();

    $offsetsFromEachAttempt = [300, 900, 3600, 3600];
    $attemptAt = $start + 60;
    foreach ($offsetsFromEachAttempt as $offset) {
        $this->travelTo(CarbonImmutable::createFromTimestampUTC(nextAvailableAt()));
        MailWorld::runWorker();

        expect(nextAvailableAt())->toBe($attemptAt + $offset);
        $attemptAt += $offset;
    }
    expect(FailingTransport::$calls)->toBe(5)
        ->and(DB::table('failed_jobs')->count())->toBe(0);
});

it('fails the job without calling the provider once the 24 hour window of an invitation is over', function () {
    $issued = queueFailingInvitation();
    MailWorld::runWorker();
    $callsBefore = FailingTransport::$calls;

    $this->travelTo(CarbonImmutable::parse(FAILURE_START, 'UTC')->addHours(24)->addSecond());
    MailWorld::runWorker();

    $row = DB::table('invitations')->where('id', $issued->invitation->id)->first(['sent_at', 'send_failed_at']);
    $failed = MailWorld::recordsNamed($this->handler, 'mail.failed');
    expect(FailingTransport::$calls)->toBe($callsBefore)
        ->and(DB::table('failed_jobs')->count())->toBe(1)
        ->and(DB::table('mail_jobs')->count())->toBe(0)
        ->and($row->send_failed_at)->not->toBeNull()
        ->and($row->sent_at)->toBeNull()
        ->and($failed)->toHaveCount(1)
        ->and($failed[0]->context['cause'])->toBe('expired');
});

it('does not send a password reset after its 60 minute link expired', function () {
    $issued = new IssuedResetLink('https://taller.example/#restablecer=abc123&email=ana%40x.com', CarbonImmutable::now()->addMinutes(60));
    SendMail::dispatch(OutgoingMail::passwordReset('ana@x.com', 'Ana', $issued));

    $this->travelTo(CarbonImmutable::parse(FAILURE_START, 'UTC')->addMinutes(61));
    MailWorld::runWorker();

    expect(FailingTransport::$calls)->toBe(0)
        ->and(MailWorld::sent())->toBe([])
        ->and(DB::table('failed_jobs')->count())->toBe(1);
});

it('a rejection that names the recipient leaves no address in failed_jobs nor in the logs', function () {
    $issued = queueFailingInvitation();
    FailingTransport::$reason = '550 5.1.1 <ana@x.com>: Recipient address rejected';
    FailingTransport::$beforeFailing = fn () => $this->travelTo(CarbonImmutable::parse(FAILURE_START, 'UTC')->addHours(25));

    MailWorld::runWorker();

    $failedJob = DB::table('failed_jobs')->first();
    $text = MailWorld::loggedText($this->handler);
    expect($failedJob)->not->toBeNull()
        ->and($failedJob->exception)->toContain('TransportException 0')
        ->and($failedJob->exception)->not->toContain('ana@x.com')
        ->and($failedJob->exception)->not->toContain($issued->token)
        ->and($failedJob->payload)->not->toContain('ana@x.com')
        ->and($failedJob->payload)->not->toContain($issued->token)
        ->and($text)->not->toContain('ana@x.com')
        ->and($text)->not->toContain($issued->token)
        ->and($text)->not->toContain('Recipient address rejected');
});
