<?php

namespace App\Http\Requests;

use App\Auth\PrivacyNotice;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class AcceptInvitationRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'token' => ['required', 'string'],
            'name' => ['required', 'string', 'max:80', 'regex:/\A[^\p{Cc}]+\z/u'],
            'password' => ['required', 'string'],
            'password_confirmation' => ['required', 'string', 'same:password'],
            'privacyVersion' => ['required', 'string', Rule::in([(new PrivacyNotice)->current()])],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'name.regex' => 'El nombre no puede tener caracteres de control.',
            'password_confirmation.same' => 'La confirmación de la contraseña no coincide.',
            'privacyVersion.in' => 'Esa no es la versión vigente del aviso de privacidad.',
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'password_confirmation' => 'confirmación de la contraseña',
            'privacyVersion' => 'versión del aviso de privacidad',
        ];
    }
}
