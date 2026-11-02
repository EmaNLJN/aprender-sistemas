<?php

namespace App\Http\Requests\Admin;

use App\Runs\Record\Instant;
use App\Stats\Granularity;
use App\Stats\Period;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StatsPeriodRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'from' => ['nullable', 'date_format:Y-m-d', 'required_with:to'],
            'to' => ['nullable', 'date_format:Y-m-d', 'required_with:from', 'after_or_equal:from'],
            'granularity' => ['nullable', Rule::enum(Granularity::class)],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'from.*' => __('admin.stats.from'),
            'to.*' => __('admin.stats.to'),
            'granularity.*' => __('admin.stats.granularity'),
        ];
    }

    /** @return list<Closure(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty() || ! $this->filled('from')) {
                return;
            }
            if ($this->period()->days() > config()->integer('stats.max_days')) {
                $validator->errors()->add('to', __('admin.stats.too_long'));
            }
        }];
    }

    public function period(): Period
    {
        return Period::of(
            $this->filled('from') ? $this->string('from')->toString() : null,
            $this->filled('to') ? $this->string('to')->toString() : null,
            $this->enum('granularity', Granularity::class),
            Instant::now(),
            config()->string('stats.timezone'),
            config()->integer('stats.default_days'),
        );
    }
}
