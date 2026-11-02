<?php

use App\Auth\IssuedInvitation;
use App\Auth\IssuedResetLink;
use App\Mail\MailKind;
use App\Mail\MailText;
use App\Mail\OutgoingMail;
use App\Models\Invitation;
use Carbon\CarbonImmutable;

beforeEach(function () {
    config(['app.url' => 'https://taller.example']);
});

function resolvedExampleMail(): OutgoingMail
{
    $issued = new IssuedResetLink(
        'https://taller.example/#restablecer=abc123&email=ana%40x.com',
        CarbonImmutable::parse('2026-10-12 19:30:00', 'UTC'),
    );

    return OutgoingMail::passwordReset('ana@x.com', 'Ana Pérez', $issued);
}

function invitationMail(): OutgoingMail
{
    $invitation = (new Invitation)->forceFill(['email' => 'ana@x.com', 'expires_at' => CarbonImmutable::parse('2026-10-19 12:00:00', 'UTC')]);
    $invitation->id = 5;

    return OutgoingMail::invitation(new IssuedInvitation($invitation, 'tok-invitation', false));
}

function verificationMail(): OutgoingMail
{
    return OutgoingMail::emailVerification('beto@x.com', 'Beto', 'https://taller.example/#verificar=12.1760000000.abcdef', CarbonImmutable::parse('2026-10-12 19:30:00', 'UTC'));
}

it('writes the resolved example of the contract byte by byte', function () {
    $expected = <<<'TEXT'
        Hola, Ana Pérez:

        Alguien pidió elegir otra contraseña para tu cuenta del Taller Rust y Go. Si fuiste vos, abrí este enlace:

        https://taller.example/#restablecer=abc123&email=ana%40x.com

        El enlace vence el 12/10/2026 a las 16:30 (hora de Argentina) y sirve una sola vez.

        Si no lo pediste, ignorá este correo: tu contraseña sigue siendo la misma.

        —
        Taller Rust y Go
        Este correo se mandó solo: no respondas a esta dirección.

        TEXT;

    expect((new MailText)->body(resolvedExampleMail()))->toBe($expected);
});

it('gives each kind its fixed subject, greeting, text and closing', function (string $kindValue, string $subject, string $greeting, string $body, string $closing) {
    $kind = MailKind::from($kindValue);
    $mail = match ($kind) {
        MailKind::Invitation => invitationMail(),
        MailKind::EmailVerification => verificationMail(),
        MailKind::PasswordReset => resolvedExampleMail(),
        default => OutgoingMail::notice($kind, 'beto@x.com', 'Beto'),
    };
    $text = new MailText;

    expect($text->subject($kind))->toBe($subject)
        ->and($text->body($mail))->toStartWith($greeting."\n\n".$body."\n\n")
        ->and($text->body($mail))->toContain("\n\n".$closing."\n\n—\nTaller Rust y Go\n");
})->with([
    'invitation' => ['invitation', 'Te invitaron al Taller Rust y Go', 'Hola:', 'Te invitaron a crear tu cuenta en el Taller Rust y Go. Para aceptar, abrí este enlace y elegí tu nombre y tu contraseña:', 'Si no esperabas esta invitación, ignorá este correo: sin el enlace no se crea ninguna cuenta.'],
    'password reset' => ['password_reset', 'Elegí otra contraseña para el Taller Rust y Go', 'Hola, Ana Pérez:', 'Alguien pidió elegir otra contraseña para tu cuenta del Taller Rust y Go. Si fuiste vos, abrí este enlace:', 'Si no lo pediste, ignorá este correo: tu contraseña sigue siendo la misma.'],
    'password changed' => ['password_changed', 'Cambió la contraseña de tu cuenta del taller', 'Hola, Beto:', 'La contraseña de tu cuenta del Taller Rust y Go acaba de cambiar, y las demás sesiones se cerraron.', 'Si fuiste vos, no tenés que hacer nada. Si no lo hiciste, avisale enseguida a quien administra el taller.'],
    'admin role' => ['admin_role', 'Ahora administrás el Taller Rust y Go', 'Hola, Beto:', 'Tu cuenta del Taller Rust y Go ahora tiene el rol de admin: podés invitar personas y administrar las cuentas.', 'Si no esperabas este cambio, avisale a quien administra el taller.'],
    'account deleted' => ['account_deleted', 'Borramos tu cuenta del Taller Rust y Go', 'Hola, Beto:', 'Tu cuenta del Taller Rust y Go y sus datos se borraron.', 'Si no lo pediste, avisale a quien administra el taller.'],
    'email verification' => ['email_verification', 'Confirmá tu email para el Taller Rust y Go', 'Hola, Beto:', 'Para terminar de crear tu cuenta en el Taller Rust y Go, confirmá que este email es tuyo: abrí este enlace con la sesión iniciada.', 'Si no creaste una cuenta, ignorá este correo: una cuenta sin confirmar se borra sola a los 7 días.'],
    'email changed' => ['email_changed', 'Cambió el email de tu cuenta del taller', 'Hola, Beto:', 'El email de tu cuenta del Taller Rust y Go cambió. Desde ahora ingresás con la dirección nueva, y las sesiones abiertas se cerraron.', 'Si no lo pediste, avisale enseguida a quien administra el taller.'],
    'registration attempt' => ['registration_attempt', 'Alguien intentó crear una cuenta con tu email', 'Hola, Beto:', 'Alguien intentó crear una cuenta nueva en el Taller Rust y Go con este email, que ya tiene una. No se creó nada.', 'Si fuiste vos, ingresá con tu cuenta; si olvidaste la contraseña, pedí otra desde la pantalla de ingreso. Si no fuiste vos, no tenés que hacer nada.'],
]);

it('puts the link on its own line followed by the expiry in Argentine time', function () {
    expect((new MailText)->body(invitationMail()))
        ->toContain("\n\nhttps://taller.example/#invitacion=tok-invitation\n\nEl enlace vence el 19/10/2026 a las 09:00 (hora de Argentina) y sirve una sola vez.\n\n")
        ->and((new MailText)->body(verificationMail()))
        ->toContain("\n\nhttps://taller.example/#verificar=12.1760000000.abcdef\n\nEl enlace vence el 12/10/2026 a las 16:30 (hora de Argentina).\n\n");
});

it('carries no link in the five kinds that have none', function (string $kind) {
    $body = (new MailText)->body(OutgoingMail::notice(MailKind::from($kind), 'beto@x.com', 'Beto'));

    expect($body)->not->toContain('http')->and($body)->not->toContain('hora de Argentina');
})->with(['password_changed', 'admin_role', 'account_deleted', 'email_changed', 'registration_attempt']);

it('never mentions a password value or markup', function (string $kind) {
    $body = (new MailText)->body(OutgoingMail::notice(MailKind::from($kind), 'beto@x.com', 'Beto'));

    expect($body)->not->toContain('password')
        ->and($body)->not->toMatch('/contraseña:\s*\S/u')
        ->and($body)->not->toContain('<');
})->with(['password_changed', 'admin_role', 'account_deleted', 'email_changed', 'registration_attempt']);

it('does not replace a placeholder that a name contains', function () {
    $body = (new MailText)->body(OutgoingMail::notice(MailKind::PasswordChanged, 'ana@x.com', 'Ana :expires'));

    expect($body)->toStartWith("Hola, Ana :expires:\n\n");
});
