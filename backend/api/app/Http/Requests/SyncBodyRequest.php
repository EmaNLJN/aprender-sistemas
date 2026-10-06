<?php

namespace App\Http\Requests;

use App\Progress\Sync\SyncRequest;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use LogicException;
use Throwable;

final class SyncBodyRequest extends FormRequest
{
    private const INSTANT_FORMAT = 'Y-m-d\TH:i:s.v\Z';

    private const UUID_V4 = '/\A[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\z/';

    private const CONTENT_VERSION = '/\A[0-9a-f]{32}\z/';

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'epoch' => ['bail', 'required', $this->mustBePositiveInteger(...)],
            'sentAt' => ['bail', 'required', $this->mustBeInstant(...)],
            'knownRevision' => ['bail', 'sometimes', $this->mustBeNonNegativeInteger(...)],
            'knownContentVersion' => ['bail', 'sometimes', 'nullable', $this->mustBeContentVersion(...)],
            'format' => ['bail', 'required', $this->mustBeInteger(...)],
            'operations' => ['bail', 'present', $this->mustBeOperationList(...)],
            'operations.*' => ['bail', $this->mustBeObject(...)],
            'operations.*.id' => ['bail', 'required', $this->mustBeOperationId(...)],
            'operations.*.type' => ['bail', 'required', 'string'],
            'operations.*.at' => ['bail', 'required', $this->mustBeInstant(...)],
        ];
    }

    public function toSyncRequest(): SyncRequest
    {
        $knownContentVersion = $this->input('knownContentVersion');

        return new SyncRequest(
            epoch: $this->integer('epoch'),
            sentAt: self::parseInstant($this->string('sentAt')->toString()) ?? throw new LogicException('The rules guarantee a valid sentAt.'),
            knownRevision: $this->integer('knownRevision', 0),
            knownContentVersion: is_string($knownContentVersion) ? $knownContentVersion : null,
            format: $this->integer('format'),
            operations: $this->rawOperations(),
        );
    }

    /** @return list<array<string, mixed>> */
    private function rawOperations(): array
    {
        $operations = [];
        $received = $this->input('operations');
        foreach (is_array($received) ? $received : [] as $operation) {
            $operations[] = collect(is_array($operation) ? $operation : [])->mapWithKeys(fn (mixed $value, int|string $field) => [(string) $field => $value])->all();
        }

        return $operations;
    }

    private static function parseInstant(string $value): ?CarbonImmutable
    {
        try {
            $parsed = CarbonImmutable::createFromFormat('!'.self::INSTANT_FORMAT, $value, 'UTC');
        } catch (Throwable) {
            return null;
        }

        return $parsed instanceof CarbonImmutable && $parsed->format(self::INSTANT_FORMAT) === $value ? $parsed : null;
    }

    private function mustBePositiveInteger(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_int($value) || $value < 1) {
            $fail("El campo {$attribute} debe ser un entero de 1 o más.");
        }
    }

    private function mustBeNonNegativeInteger(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_int($value) || $value < 0) {
            $fail("El campo {$attribute} debe ser un entero de 0 o más.");
        }
    }

    private function mustBeInteger(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_int($value)) {
            $fail("El campo {$attribute} debe ser un entero.");
        }
    }

    private function mustBeInstant(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || self::parseInstant($value) === null) {
            $fail("El campo {$attribute} debe ser un instante con la forma 2026-10-06T12:00:00.123Z.");
        }
    }

    private function mustBeContentVersion(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || preg_match(self::CONTENT_VERSION, $value) !== 1) {
            $fail("El campo {$attribute} debe tener 32 hexadecimales en minúsculas.");
        }
    }

    private function mustBeOperationList(string $attribute, mixed $value, Closure $fail): void
    {
        $maximum = config()->integer('progress.sync.max_operations');
        if (! is_array($value) || ! array_is_list($value)) {
            $fail("El campo {$attribute} debe ser una lista.");
        } elseif (count($value) > $maximum) {
            $fail("El campo {$attribute} no puede tener más de {$maximum} operaciones.");
        }
    }

    private function mustBeObject(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_array($value) || array_is_list($value) && $value !== []) {
            $fail("El campo {$attribute} debe ser un objeto.");
        }
    }

    private function mustBeOperationId(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || preg_match(self::UUID_V4, $value) !== 1) {
            $fail("El campo {$attribute} debe ser un UUID v4 en minúsculas.");
        }
    }
}
