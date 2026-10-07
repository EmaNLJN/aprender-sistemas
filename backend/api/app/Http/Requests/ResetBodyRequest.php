<?php

namespace App\Http\Requests;

use App\Progress\Reset\ResetRequest;
use Closure;
use Illuminate\Foundation\Http\FormRequest;

final class ResetBodyRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'format' => ['bail', 'required', $this->mustBeInteger(...)],
            'epoch' => ['bail', 'required', $this->mustBePositiveInteger(...)],
        ];
    }

    public function toResetRequest(): ResetRequest
    {
        return new ResetRequest(epoch: $this->integer('epoch'), format: $this->integer('format'));
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
}
