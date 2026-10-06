<?php

namespace App\Http\Requests;

use App\Auth\PrivacyNotice;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class PrivacyRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return ['privacyVersion' => ['required', 'string', Rule::in([(new PrivacyNotice)->current()])]];
    }
}
