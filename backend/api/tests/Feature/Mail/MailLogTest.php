<?php

use App\Mail\MailKind;
use App\Mail\MailLog;
use App\Mail\OutgoingMail;
use Illuminate\Queue\MaxAttemptsExceededException;
use Tests\Support\MailWorld;

beforeEach(function () {
    $this->handler = MailWorld::captureLogs();
    $this->mail = OutgoingMail::notice(MailKind::PasswordChanged, 'ana@x.com', 'Ana');
});

/** @return list<string> */
function contextKeysOf(object $test, string $message): array
{
    $records = MailWorld::recordsNamed($test->handler, $message);
    expect($records)->toHaveCount(1);
    $keys = array_keys($records[0]->context);
    sort($keys);

    return $keys;
}

it('logs mail.queued with the kind and the recipient fingerprint', function () {
    MailLog::queued($this->mail);

    $context = MailWorld::recordsNamed($this->handler, 'mail.queued')[0]->context;
    expect(contextKeysOf($this, 'mail.queued'))->toBe(['kind', 'recipient_hmac'])
        ->and($context['kind'])->toBe('password_changed')
        ->and($context['recipient_hmac'])->toMatch('/\A[0-9a-f]{16}\z/');
});

it('logs mail.skipped as link only', function () {
    MailLog::skipped(MailKind::AdminRole);

    $context = MailWorld::recordsNamed($this->handler, 'mail.skipped')[0]->context;
    expect(contextKeysOf($this, 'mail.skipped'))->toBe(['kind', 'reason'])
        ->and($context['kind'])->toBe('admin_role')
        ->and($context['reason'])->toBe('link_only');
});

it('logs mail.sent with the job, the kind, the fingerprint and the attempt', function () {
    MailLog::sent('job-1', $this->mail, 2);

    $context = MailWorld::recordsNamed($this->handler, 'mail.sent')[0]->context;
    expect(contextKeysOf($this, 'mail.sent'))->toBe(['attempt', 'job', 'kind', 'recipient_hmac'])
        ->and($context['job'])->toBe('job-1')
        ->and($context['attempt'])->toBe(2)
        ->and($context['recipient_hmac'])->toMatch('/\A[0-9a-f]{16}\z/');
});

it('logs mail.attempt_failed with the cause and without the message', function () {
    MailLog::attemptFailed('job-1', $this->mail, 1, new RuntimeException('550 <ana@x.com> rejected'));

    $context = MailWorld::recordsNamed($this->handler, 'mail.attempt_failed')[0]->context;
    expect(contextKeysOf($this, 'mail.attempt_failed'))->toBe(['attempt', 'cause', 'job', 'kind', 'recipient_hmac'])
        ->and($context['cause'])->toBe('RuntimeException 0')
        ->and(MailWorld::loggedText($this->handler))->not->toContain('ana@x.com');
});

it('logs mail.failed with expired for an exhausted window and the class for anything else', function () {
    MailLog::failed('job-1', $this->mail, new MaxAttemptsExceededException);
    MailLog::failed('job-2', $this->mail, new LogicException('boom'));

    $records = MailWorld::recordsNamed($this->handler, 'mail.failed');
    expect(array_keys($records[0]->context))->toEqualCanonicalizing(['job', 'kind', 'recipient_hmac', 'cause'])
        ->and($records[0]->context['cause'])->toBe('expired')
        ->and($records[1]->context['cause'])->toBe('LogicException 0');
});

it('logs mail.superseded, mail.reset_skipped and mail.app_url_local with their own keys', function () {
    MailLog::superseded('job-1', 7);
    MailLog::resetSkipped('no_account');
    MailLog::appUrlLocal('localhost');

    expect(contextKeysOf($this, 'mail.superseded'))->toBe(['invitation_id', 'job'])
        ->and(contextKeysOf($this, 'mail.reset_skipped'))->toBe(['reason'])
        ->and(contextKeysOf($this, 'mail.app_url_local'))->toBe(['host']);
});
