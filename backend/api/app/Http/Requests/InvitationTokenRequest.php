<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class InvitationTokenRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return ['token' => ['required', 'string']];
    }
}
