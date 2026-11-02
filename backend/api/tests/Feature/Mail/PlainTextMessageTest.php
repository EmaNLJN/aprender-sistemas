<?php

use App\Auth\IssuedInvitation;
use App\Auth\IssuedResetLink;
use App\Mail\MailText;
use App\Mail\OutgoingMail;
use App\Mail\PlainTextMessage;
use App\Models\Invitation;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mime\Email;
use Tests\Support\MailWorld;

beforeEach(function () {
    config(['app.url' => 'https://taller.example']);
});

function invitationMessage(): PlainTextMessage
{
    $invitation = (new Invitation)->forceFill(['email' => 'ana@x.com', 'expires_at' => CarbonImmutable::parse('2026-10-19 12:00:00', 'UTC')]);
    $invitation->id = 5;

    return new PlainTextMessage(OutgoingMail::invitation(new IssuedInvitation($invitation, 'tok-invitation', false)));
}

function resetMessage(): PlainTextMessage
{
    $issued = new IssuedResetLink('https://taller.example/#restablecer=abc123&email=ana%40x.com', CarbonImmutable::parse('2026-10-12 19:30:00', 'UTC'));

    return new PlainTextMessage(OutgoingMail::passwordReset('ana@x.com', 'Ana', $issued));
}

it('is addressed to the recipient with the fixed subject of its kind', function () {
    Mail::fake();

    Mail::send(invitationMessage());

    Mail::assertSent(PlainTextMessage::class, fn (PlainTextMessage $message) => $message->hasTo('ana@x.com') && $message->hasSubject('Te invitaron al Taller Rust y Go'));
});

it('shows the link in the text without escaping the ampersand', function () {
    invitationMessage()->assertSeeInText('#invitacion=');
    resetMessage()->assertSeeInText('#restablecer=abc123&email=ana%40x.com')->assertDontSeeInText('&amp;');
});

it('sends one text part to one bare recipient from the configured sender', function () {
    $message = resetMessage();

    Mail::send($message);

    $sent = MailWorld::sent();
    $original = $sent[0]->getOriginalMessage();

    expect($sent)->toHaveCount(1)
        ->and($original)->toBeInstanceOf(Email::class)
        ->and($original->getTextBody())->toBe((new MailText)->body($message->mail))
        ->and($original->getTextBody())->toStartWith("Hola, Ana:\n\n")
        ->and($original->getHtmlBody())->toBeNull()
        ->and($original->getTo())->toHaveCount(1)
        ->and($original->getTo()[0]->getAddress())->toBe('ana@x.com')
        ->and($original->getTo()[0]->getName())->toBe('')
        ->and($original->getFrom()[0]->getAddress())->toBe('hello@example.com')
        ->and($original->getFrom()[0]->getName())->toBe('Taller Rust y Go');
});
