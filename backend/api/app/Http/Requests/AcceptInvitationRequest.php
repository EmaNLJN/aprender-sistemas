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
}
