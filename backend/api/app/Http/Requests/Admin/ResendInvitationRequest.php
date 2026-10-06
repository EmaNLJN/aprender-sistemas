<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class ResendInvitationRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return ['delivery' => ['sometimes', Rule::in(['link', 'email'])]];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return ['delivery.in' => __('invitations.delivery.in')];
    }

    public function delivery(): ?string
    {
        return $this->has('delivery') ? $this->string('delivery')->toString() : null;
    }
}
