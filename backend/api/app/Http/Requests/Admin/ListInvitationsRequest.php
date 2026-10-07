<?php

namespace App\Http\Requests\Admin;

use App\Auth\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class ListInvitationsRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'page' => ['integer', 'min:1'],
            'perPage' => ['integer', 'between:1,100'],
            'role' => [Rule::enum(Role::class)],
            'state' => [Rule::in(['pending', 'expired'])],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'page.integer' => __('invitations.page.integer'),
            'page.min' => __('invitations.page.min', ['min' => 1]),
            'perPage.integer' => __('invitations.per_page.integer'),
            'perPage.between' => __('invitations.per_page.between', ['min' => 1, 'max' => 100]),
            'role.enum' => __('invitations.role.enum'),
            'state.in' => __('invitations.state.in'),
        ];
    }

    public function page(): int
    {
        return $this->integer('page', 1);
    }

    public function perPage(): int
    {
        return $this->integer('perPage', 25);
    }

    public function role(): ?Role
    {
        return $this->has('role') ? Role::from($this->string('role')->toString()) : null;
    }

    public function state(): ?string
    {
        return $this->has('state') ? $this->string('state')->toString() : null;
    }
}
