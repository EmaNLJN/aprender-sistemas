<?php

namespace App\Http\Requests;

use App\Auth\PlainPassword;
use Illuminate\Foundation\Http\FormRequest;

final class LoginRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string'],
            'remember' => ['sometimes', 'boolean'],
        ];
    }

    public function email(): string
    {
        return $this->string('email')->toString();
    }

    public function password(): PlainPassword
    {
        return PlainPassword::of($this->string('password')->toString());
    }

    public function remember(): bool
    {
        return $this->boolean('remember');
    }
}
