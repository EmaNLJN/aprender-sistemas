<?php

namespace App\Http\Requests\Admin;

use App\Runs\RunLanguage;
use App\Stats\Content\ContentFilters;
use Illuminate\Validation\Rule;

final class ContentStatsRequest extends StatsPeriodRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'catalog' => ['nullable', 'string', 'max:32', Rule::exists('catalogs', 'code')],
            'language' => ['nullable', Rule::enum(RunLanguage::class)],
            'level' => ['nullable', Rule::in(['beginner', 'medium', 'advanced', 'expert'])],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            ...parent::messages(),
            'catalog.*' => __('admin.stats.catalog'),
            'language.*' => __('admin.stats.language'),
            'level.*' => __('admin.stats.level'),
        ];
    }

    public function filters(): ContentFilters
    {
        return new ContentFilters(
            $this->filled('catalog') ? $this->string('catalog')->toString() : null,
            $this->filled('language') ? $this->string('language')->toString() : null,
            $this->filled('level') ? $this->string('level')->toString() : null,
        );
    }
}
