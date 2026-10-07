<?php

namespace App\Http\Requests\Admin;

use App\Auth\Email;
use App\Auth\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class InviteRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'emails' => ['required', 'array', 'min:1', 'max:100'],
            'emails.*' => ['required', 'string', 'email', 'max:254', 'distinct'],
            'role' => ['required', Rule::enum(Role::class)],
            'delivery' => ['required', Rule::in(['link', 'email'])],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'emails.required' => __('invitations.emails.required'),
            'emails.array' => __('invitations.emails.array'),
            'emails.min' => __('invitations.emails.min'),
            'emails.max' => __('invitations.emails.max', ['max' => 100]),
            'emails.*.required' => __('invitations.email.required'),
            'emails.*.string' => __('invitations.email.string'),
            'emails.*.email' => __('invitations.email.email'),
            'emails.*.max' => __('invitations.email.max', ['max' => 254]),
            'emails.*.distinct' => __('invitations.email.distinct'),
            'role.required' => __('invitations.role.required'),
            'role.enum' => __('invitations.role.enum'),
            'delivery.required' => __('invitations.delivery.required'),
            'delivery.in' => __('invitations.delivery.in'),
        ];
    }

    /** @return list<string> */
    public function emails(): array
    {
        $emails = [];
        foreach ($this->array('emails') as $email) {
            $emails[] = is_string($email) ? $email : '';
        }

        return $emails;
    }

    public function role(): Role
    {
        return Role::from($this->string('role')->toString());
    }

    public function delivery(): string
    {
        return $this->string('delivery')->toString();
    }

    protected function prepareForValidation(): void
    {
        $emails = $this->input('emails');
        if (! is_array($emails)) {
            return;
        }

        $canonical = [];
        foreach ($emails as $key => $email) {
            $canonical[$key] = is_string($email) ? Email::canonical($email) : $email;
        }
        $this->merge(['emails' => $canonical]);
    }
}
