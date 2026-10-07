<?php

namespace App\Http\Requests;

use App\Auth\PlainPassword;
use Illuminate\Foundation\Http\FormRequest;

final class LogoutOthersRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return ['password' => ['required', 'string']];
    }

    public function password(): PlainPassword
    {
        return PlainPassword::of($this->string('password')->toString());
    }
}
