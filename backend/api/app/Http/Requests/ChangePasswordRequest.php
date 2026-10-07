<?php

namespace App\Http\Requests;

use App\Auth\PlainPassword;
use Illuminate\Foundation\Http\FormRequest;

final class ChangePasswordRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'confirmed'],
        ];
    }

    public function currentPassword(): PlainPassword
    {
        return PlainPassword::of($this->string('current_password')->toString());
    }

    public function newPassword(): PlainPassword
    {
        return PlainPassword::of($this->string('password')->toString());
    }
}
