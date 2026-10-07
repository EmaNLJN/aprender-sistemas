<?php

use App\Http\ApiCode;
use Tests\TestCase;

uses(TestCase::class);

dataset('contract codes', [
    'unauthenticated' => [ApiCode::Unauthenticated, 'unauthenticated', 401, 'Iniciá sesión para continuar.'],
    'forbidden' => [ApiCode::Forbidden, 'forbidden', 403, 'No tenés permiso para hacer esto.'],
    'account_disabled' => [ApiCode::AccountDisabled, 'account_disabled', 403, 'Tu cuenta está deshabilitada. Consultá con quien administra el taller.'],
    'email_unverified' => [ApiCode::EmailUnverified, 'email_unverified', 403, 'Verificá tu email para continuar.'],
    'not_found' => [ApiCode::NotFound, 'not_found', 404, 'No existe lo que pedís.'],
    'invitation_not_found' => [ApiCode::InvitationNotFound, 'invitation_not_found', 404, 'La invitación no existe o ya se usó.'],
    'method_not_allowed' => [ApiCode::MethodNotAllowed, 'method_not_allowed', 405, 'Ese método no está permitido en esta ruta.'],
    'email_taken' => [ApiCode::EmailTaken, 'email_taken', 409, 'Ya hay una cuenta con ese email.'],
    'account_mismatch' => [ApiCode::AccountMismatch, 'account_mismatch', 409, 'La sesión cambió de cuenta: recargá la página.'],
    'invitation_expired' => [ApiCode::InvitationExpired, 'invitation_expired', 410, 'La invitación venció. Pedí una nueva a quien te invitó.'],
    'csrf_token_mismatch' => [ApiCode::CsrfTokenMismatch, 'csrf_token_mismatch', 419, 'La página venció: recargala e intentá de nuevo.'],
    'validation_failed' => [ApiCode::ValidationFailed, 'validation_failed', 422, 'Hay datos que corregir.'],
    'auth_failed' => [ApiCode::AuthFailed, 'auth_failed', 422, 'El email o la contraseña no son correctos.'],
    'password_confirmation_required' => [ApiCode::PasswordConfirmationRequired, 'password_confirmation_required', 423, 'Confirmá tu contraseña para continuar.'],
    'too_many_requests' => [ApiCode::TooManyRequests, 'too_many_requests', 429, 'Demasiados intentos. Esperá un momento antes de volver a probar.'],
    'bad_request' => [ApiCode::BadRequest, 'bad_request', 400, 'No se pudo entender el pedido.'],
    'server_error' => [ApiCode::ServerError, 'server_error', 500, 'Algo salió mal de nuestro lado. Probá de nuevo en un rato.'],
    'client_run_id_reused' => [ApiCode::ClientRunIdReused, 'client_run_id_reused', 422, 'Ese identificador de ejecución ya se usó con otro código, otro ejercicio u otra prueba propia.'],
    'quota_exceeded' => [ApiCode::QuotaExceeded, 'quota_exceeded', 429, 'Llegaste a un límite de ejecuciones: esperá antes de volver a probar.'],
    'queue_full' => [ApiCode::QueueFull, 'queue_full', 503, 'El taller está ocupado ahora mismo: reintentá en unos segundos.'],
    'epoch_mismatch' => [ApiCode::EpochMismatch, 'epoch_mismatch', 409, 'Tu progreso se borró desde otro dispositivo. Se cargará el estado nuevo.'],
    'client_outdated' => [ApiCode::ClientOutdated, 'client_outdated', 409, 'Esta pestaña quedó vieja. Recargá la página para seguir sincronizando.'],
    'import_needs_confirmation' => [ApiCode::ImportNeedsConfirmation, 'import_needs_confirmation', 409, 'Confirmá que esta copia es tuya antes de combinarla con el progreso de tu cuenta.'],
]);

it('maps each code to the status and Spanish message of the HTTP contract', function (ApiCode $code, string $value, int $status, string $message) {
    expect($code->value)->toBe($value)
        ->and($code->status())->toBe($status)
        ->and($code->message())->toBe($message);
})->with('contract codes');

it('has exactly the 23 codes of the contract', function () {
    expect(ApiCode::cases())->toHaveCount(23);
});

it('words each run quota in Spanish', function (string $quota, string $message) {
    expect(__("api.quota.{$quota}"))->toBe($message);
})->with([
    'active' => ['active', 'Ya tenés una ejecución en curso: esperá a que termine.'],
    'per_minute' => ['per_minute', 'Hiciste demasiadas ejecuciones en el último minuto: esperá un momento.'],
    'per_day' => ['per_day', 'Llegaste al máximo de ejecuciones de las últimas 24 horas.'],
    'sandbox_time' => ['sandbox_time', 'Llegaste al máximo de tiempo de ejecución de las últimas 24 horas.'],
]);
