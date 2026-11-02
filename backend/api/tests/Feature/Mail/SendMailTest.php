<?php

use App\Auth\Invitations;
use App\Auth\IssuedInvitation;
use App\Auth\Role;
use App\Jobs\SendMail;
use App\Mail\MailKind;
use App\Mail\OutgoingMail;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\Support\MailWorld;

beforeEach(function () {
    MailWorld::available();
    MailWorld::onDatabaseQueue();
    config(['app.url' => 'https://taller.example']);
});

function issueInvitationTo(string $email): IssuedInvitation
{
    return app(Invitations::class)->issue($email, Role::Student, null);
}

function invitationRow(IssuedInvitation $issued): object
{
    return DB::table('invitations')->where('id', $issued->invitation->id)->first(['sent_at', 'send_failed_at', 'token_hash']);
}

/** @return list<string> */
function queriesWhile(Closure $work): array
{
    $statements = [];
    DB::listen(function ($query) use (&$statements) {
        $statements[] = $query->sql;
    });
    $work();

    return $statements;
}

it('sends the mail of a current invitation and marks only sent_at', function () {
    $issued = issueInvitationTo('ana@x.com');
    SendMail::dispatch(OutgoingMail::invitation($issued));
    expect(DB::table('mail_jobs')->count())->toBe(1);

    MailWorld::runWorker();

    $sent = MailWorld::sent();
    $row = invitationRow($issued);
    expect($sent)->toHaveCount(1)
        ->and($sent[0]->getOriginalMessage()->getTextBody())->toContain('https://taller.example/#invitacion='.$issued->token)
        ->and(DB::table('mail_jobs')->count())->toBe(0)
        ->and($row->sent_at)->not->toBeNull()
        ->and($row->send_failed_at)->toBeNull();
});

it('sends a notice without looking at any invitation', function () {
    SendMail::dispatch(OutgoingMail::notice(MailKind::PasswordChanged, 'beto@x.com', 'Beto'));

    $statements = queriesWhile(fn () => MailWorld::runWorker());

    expect(MailWorld::sent())->toHaveCount(1)
        ->and(collect($statements)->filter(fn (string $sql) => str_contains($sql, 'invitations')))->toBeEmpty();
});

it('never reads users, sessions or password reset tokens while it works', function () {
    SendMail::dispatch(OutgoingMail::notice(MailKind::AdminRole, 'beto@x.com', 'Beto'));
    $issued = issueInvitationTo('ana@x.com');
    SendMail::dispatch(OutgoingMail::invitation($issued));

    $statements = queriesWhile(function () {
        MailWorld::runWorker();
        MailWorld::runWorker();
    });

    expect(MailWorld::sent())->toHaveCount(2)
        ->and(collect($statements)->filter(fn (string $sql) => preg_match('/`(users|sessions|password_reset_tokens)`/', $sql) === 1))->toBeEmpty();
});

it('a mail whose invitation was rotated, revoked or accepted is neither sent nor marks the row', function (string $change) {
    $handler = MailWorld::captureLogs();
    $issued = issueInvitationTo('ana@x.com');
    $invitationId = $issued->invitation->id;
    SendMail::dispatch(OutgoingMail::invitation($issued));

    match ($change) {
        'rotated' => DB::table('invitations')->where('id', $invitationId)->update(['token_hash' => hash('sha256', 'another token')]),
        'revoked' => DB::table('invitations')->where('id', $invitationId)->delete(),
        'accepted' => (function () use ($invitationId) {
            DB::table('invitations')->where('id', $invitationId)->delete();
            User::factory()->create(['email' => 'ana@x.com']);
        })(),
    };

    MailWorld::runWorker();

    $row = DB::table('invitations')->where('id', $invitationId)->first(['sent_at', 'send_failed_at']);
    $superseded = MailWorld::recordsNamed($handler, 'mail.superseded');
    expect(MailWorld::sent())->toBe([])
        ->and($row?->sent_at)->toBeNull()
        ->and($row?->send_failed_at)->toBeNull()
        ->and(DB::table('mail_jobs')->count())->toBe(0)
        ->and(DB::table('failed_jobs')->count())->toBe(0)
        ->and($superseded)->toHaveCount(1)
        ->and($superseded[0]->context['invitation_id'])->toBe($invitationId);
})->with(['rotated', 'revoked', 'accepted']);

it('a queued mail is failed, not logged, when the workshop went link only', function () {
    $handler = MailWorld::captureLogs();
    $issued = issueInvitationTo('ana@x.com');
    SendMail::dispatch(OutgoingMail::invitation($issued));
    config(['taller.mail.required' => true, 'mail.default' => 'log', 'mail.mailers.log.channel' => 'stderr']);

    MailWorld::runWorker();

    $failed = MailWorld::recordsNamed($handler, 'mail.failed');
    $text = MailWorld::loggedText($handler);
    expect(DB::table('failed_jobs')->count())->toBe(1)
        ->and(invitationRow($issued)->send_failed_at)->not->toBeNull()
        ->and($failed)->toHaveCount(1)
        ->and($failed[0]->context['cause'])->toBe('unavailable')
        ->and($text)->not->toContain('#invitacion=')
        ->and($text)->not->toContain($issued->token)
        ->and($text)->not->toContain('ana@x.com');
});

it('keeps the address, the name and the token out of the queued payload', function () {
    $issued = issueInvitationTo('ana@x.com');
    SendMail::dispatch(OutgoingMail::invitation($issued));
    SendMail::dispatch(OutgoingMail::notice(MailKind::PasswordChanged, 'beto@x.com', 'Beto Pérez'));

    $payloads = DB::table('mail_jobs')->pluck('payload')->all();

    expect($payloads)->toHaveCount(2);
    foreach ($payloads as $payload) {
        $command = json_decode($payload, true)['data']['command'];
        expect($payload)->not->toContain('ana@x.com')
            ->and($payload)->not->toContain('beto@x.com')
            ->and($payload)->not->toContain('Beto')
            ->and($payload)->not->toContain($issued->token)
            ->and($command)->not->toStartWith('O:');
    }
});
