<?php

use App\Models\User;
use Illuminate\Support\Facades\Validator;

it('words the identity validation failures in Spanish', function (array $data, array $rules, string $field, string $message) {
    $errors = Validator::make($data, $rules)->errors();

    expect($errors->first($field))->toBe($message);
})->with([
    'a confirmation that differs' => [
        ['password' => 'a', 'password_confirmation' => 'b'],
        ['password_confirmation' => 'same:password'],
        'password_confirmation',
        'La confirmación de la contraseña no coincide.',
    ],
    'a name with a control character' => [
        ['name' => "Ana\u{0007}"],
        ['name' => 'not_regex:/\p{Cc}/u'],
        'name',
        'El nombre no puede tener caracteres de control.',
    ],
    'a name that fails the allowed pattern' => [
        ['name' => "Ana\u{0007}"],
        ['name' => 'regex:/\A[^\p{Cc}]+\z/u'],
        'name',
        'El nombre no puede tener caracteres de control.',
    ],
    'an outdated privacy version' => [
        ['privacyVersion' => 'old'],
        ['privacyVersion' => 'in:new'],
        'privacyVersion',
        'Esa no es la versión vigente del aviso de privacidad.',
    ],
]);

it('names the current password in Spanish', function () {
    $errors = Validator::make([], ['current_password' => 'required'])->errors();

    expect($errors->first('current_password'))->toBe('El campo contraseña actual es obligatorio.');
});

it('tells the account that the privacy notice changed when it accepts an outdated version', function () {
    useSampleBlockedPasswords();
    $user = User::factory()->create();

    $this->actingAs($user)
        ->withHeader('X-Taller-User', (string) $user->id)
        ->postJson('/api/me/privacy', ['privacyVersion' => 'outdated'])
        ->assertStatus(422)
        ->assertJsonPath('errors.privacyVersion.0', 'El aviso de privacidad cambió: leelo de nuevo antes de aceptarlo.');
});
