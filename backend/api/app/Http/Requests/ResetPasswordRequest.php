<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class ResetPasswordRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'password_confirmation' => ['required', 'string', 'same:password'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return ['password_confirmation.same' => 'La confirmación de la contraseña no coincide.'];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return ['password_confirmation' => 'confirmación de la contraseña'];
    }
}
