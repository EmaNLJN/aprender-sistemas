<?php

namespace App\Http\Requests\Admin;

use App\Auth\AccountStatus;
use App\Auth\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateUserRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'role' => ['required_without:status', Rule::enum(Role::class)],
            'status' => [Rule::enum(AccountStatus::class)->only([AccountStatus::Active, AccountStatus::Disabled])],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'role.required_without' => __('admin.nothing_to_change'),
            'role.enum' => __('admin.invalid_role'),
            'status.enum' => __('admin.invalid_status'),
        ];
    }

    public function role(): ?Role
    {
        return $this->enum('role', Role::class);
    }

    public function status(): ?AccountStatus
    {
        return $this->enum('status', AccountStatus::class);
    }
}
