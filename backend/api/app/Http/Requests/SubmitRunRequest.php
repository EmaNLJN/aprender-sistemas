<?php

namespace App\Http\Requests;

use App\Runs\Admission\SubmittedRun;
use App\Runs\Program\Whitespace;
use Closure;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

final class SubmitRunRequest extends FormRequest
{
    private const FIELDS = ['clientRunId', 'exerciseId', 'code', 'customTest'];

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'clientRunId' => ['required', 'string', 'uuid'],
            'exerciseId' => ['required', 'string'],
            'code' => ['required', 'string', $this->codeIsNotBlank(...), $this->codeFitsInBytes(...)],
            'customTest' => ['nullable', 'string', 'max:'.config()->integer('runs.limits.custom_test_chars')],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            foreach (array_keys($this->getInputSource()->all()) as $field) {
                if (! in_array($field, self::FIELDS, true)) {
                    $validator->errors()->add((string) $field, "Sobra el campo {$field}.");
                }
            }
        });
    }

    public function toSubmittedRun(): SubmittedRun
    {
        $customTest = Whitespace::trim($this->string('customTest')->toString());

        return new SubmittedRun(
            strtolower($this->string('clientRunId')->toString()),
            $this->string('exerciseId')->toString(),
            $this->string('code')->toString(),
            $customTest === '' ? null : $customTest,
        );
    }

    private function codeIsNotBlank(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_string($value) && Whitespace::trim($value) === '') {
            $fail('El código no puede estar vacío.');
        }
    }

    private function codeFitsInBytes(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_string($value) && strlen($value) > config()->integer('runs.limits.code_bytes')) {
            $fail('El código pasa los 64 KiB.');
        }
    }
}
