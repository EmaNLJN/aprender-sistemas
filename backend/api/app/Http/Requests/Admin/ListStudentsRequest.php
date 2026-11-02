<?php

namespace App\Http\Requests\Admin;

use App\Stats\Accounts\StudentDirectory;
use App\Stats\Accounts\StudentFilters;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class ListStudentsRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'page' => ['integer', 'min:1'],
            'perPage' => ['integer', 'min:1', 'max:100'],
            'q' => ['nullable', 'string', 'max:80'],
            'inactiveSince' => ['nullable', 'date_format:Y-m-d'],
            'sort' => ['string', Rule::in(array_keys(StudentDirectory::SORTS))],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'page.*' => __('admin.users.page'),
            'perPage.*' => __('admin.users.per_page'),
            'q.*' => __('admin.users.q'),
            'inactiveSince.*' => __('admin.stats.inactive_since'),
            'sort.*' => __('admin.stats.sort'),
        ];
    }

    public function filters(): StudentFilters
    {
        $inactiveSince = $this->filled('inactiveSince')
            ? CarbonImmutable::createFromFormat('!Y-m-d', $this->string('inactiveSince')->toString(), config()->string('stats.timezone'))
            : null;

        return new StudentFilters(
            page: $this->integer('page', 1),
            perPage: $this->integer('perPage', 25),
            q: $this->filled('q') ? $this->string('q')->toString() : null,
            inactiveSince: $inactiveSince,
            sort: $this->string('sort', 'name')->toString(),
        );
    }
}
