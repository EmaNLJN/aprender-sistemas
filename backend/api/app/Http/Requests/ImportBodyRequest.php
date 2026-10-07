<?php

namespace App\Http\Requests;

use App\Progress\Import\ImportRequest;
use App\Progress\Import\ImportSource;
use Closure;
use Illuminate\Foundation\Http\FormRequest;

final class ImportBodyRequest extends FormRequest
{
    private const UUID_V4 = '/\A[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\z/';

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'format' => ['bail', 'required', $this->mustBeInteger(...)],
            'importId' => ['bail', 'required', $this->mustBeImportId(...)],
            'epoch' => ['bail', 'required', $this->mustBePositiveInteger(...)],
            'source' => ['bail', 'required', $this->mustBeSource(...)],
            'raw' => ['bail', 'present', $this->mustBeRawWithinTheLimit(...)],
            'normalized' => ['bail', 'present', $this->mustBeObject(...)],
            'confirm' => ['bail', 'sometimes', $this->mustBeBoolean(...)],
        ];
    }

    public function toImportRequest(): ImportRequest
    {
        $normalized = $this->input('normalized');

        return new ImportRequest(
            importId: $this->string('importId')->toString(),
            epoch: $this->integer('epoch'),
            format: $this->integer('format'),
            source: ImportSource::from($this->string('source')->toString()),
            raw: $this->string('raw')->toString(),
            normalized: is_array($normalized) ? $normalized : [],
            confirm: $this->boolean('confirm'),
        );
    }

    private function mustBeInteger(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_int($value)) {
            $fail("El campo {$attribute} debe ser un entero.");
        }
    }

    private function mustBePositiveInteger(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_int($value) || $value < 1) {
            $fail("El campo {$attribute} debe ser un entero de 1 o más.");
        }
    }

    private function mustBeImportId(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || preg_match(self::UUID_V4, $value) !== 1) {
            $fail("El campo {$attribute} debe ser un UUID v4 en minúsculas.");
        }
    }

    private function mustBeSource(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ImportSource::tryFrom($value) === null) {
            $fail("El campo {$attribute} debe ser storage o export.");
        }
    }

    private function mustBeRawWithinTheLimit(string $attribute, mixed $value, Closure $fail): void
    {
        $maximum = config()->integer('progress.import.raw_max_bytes');
        if (! is_string($value)) {
            $fail("El campo {$attribute} debe ser un texto.");
        } elseif (strlen($value) > $maximum) {
            $fail("El campo {$attribute} no puede pesar más de {$maximum} bytes.");
        }
    }

    private function mustBeObject(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_array($value) || array_is_list($value) && $value !== []) {
            $fail("El campo {$attribute} debe ser un objeto.");
        }
    }

    private function mustBeBoolean(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_bool($value)) {
            $fail("El campo {$attribute} debe ser verdadero o falso.");
        }
    }
}
