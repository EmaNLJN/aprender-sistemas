<?php

namespace App\Http\Requests\Admin;

use App\Admin\UserFilters;
use App\Auth\AccountStatus;
use App\Auth\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class ListUsersRequest extends FormRequest
{
    private const SORTS = ['name', 'email', 'role', 'status', 'createdAt'];

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'page' => ['integer', 'min:1'],
            'perPage' => ['integer', 'min:1', 'max:100'],
            'q' => ['nullable', 'string', 'max:80'],
            'role' => ['nullable', Rule::enum(Role::class)],
            'status' => ['nullable', Rule::enum(AccountStatus::class)],
            'sort' => ['string', Rule::in([...self::SORTS, ...array_map(fn (string $sort) => '-'.$sort, self::SORTS)])],
        ];
    }

    public function filters(): UserFilters
    {
        return new UserFilters(
            page: $this->integer('page', 1),
            perPage: $this->integer('perPage', 25),
            q: $this->filled('q') ? $this->string('q')->toString() : null,
            role: $this->enum('role', Role::class),
            status: $this->enum('status', AccountStatus::class),
            sort: $this->string('sort', 'name')->toString(),
        );
    }
}
