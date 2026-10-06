<?php

namespace App\Progress\Operations;

use App\Progress\Operations\OperationHash as PayloadDigest;
use Carbon\CarbonImmutable;
use LogicException;

final class OperationDecoder
{
    /**
     * @param  list<array<string, mixed>>  $raw
     * @return list<Decoded>
     */
    public function decode(array $raw): array
    {
        $decoded = [];
        foreach ($raw as $operation) {
            $decoded[] = $this->decodeOne($operation);
        }

        return $decoded;
    }

    /** @param array<string, mixed> $raw */
    private function decodeOne(array $raw): Decoded
    {
        $id = $raw['id'] ?? null;
        $type = $raw['type'] ?? null;
        $at = $raw['at'] ?? null;
        if (! is_string($id) || ! is_string($type) || ! is_string($at)) {
            throw new LogicException('Una operación cruda llega con id, type y at de texto.');
        }
        $hash = PayloadDigest::of($raw);
        $operationType = OperationType::tryFrom($type);
        if ($operationType === null) {
            return Decoded::rejected($id, $hash, RejectionReason::Invalid);
        }
        $spec = OperationCatalog::spec($operationType);
        $reason = $this->reasonToReject($spec, $raw);
        if ($reason !== null) {
            return Decoded::rejected($id, $hash, $reason);
        }

        return Decoded::valid(new Operation(
            id: $id,
            type: $operationType,
            at: CarbonImmutable::parse($at)->utc(),
            values: $this->values($spec, $raw),
            hash: $hash,
            contentVersion: is_string($raw['contentVersion'] ?? null) ? $raw['contentVersion'] : null,
        ));
    }

    /** @param array<string, mixed> $raw */
    private function reasonToReject(OperationSpec $spec, array $raw): ?RejectionReason
    {
        $fields = collect($spec->fields);
        $received = collect($raw)->except(['id', 'type', 'at'])->keys();
        $unknown = $received->diff($fields->map(fn (FieldSpec $field) => $field->name));
        $missing = $fields->reject(fn (FieldSpec $field) => $field->optional || $received->contains($field->name));
        if ($unknown->isNotEmpty() || $missing->isNotEmpty() || ! $this->hasRequiredCombination($spec, $raw)) {
            return RejectionReason::Invalid;
        }
        $reasons = $fields
            ->filter(fn (FieldSpec $field) => $received->contains($field->name))
            ->map(fn (FieldSpec $field) => FieldValidator::check($field, $raw[$field->name], $raw));
        if ($reasons->contains(RejectionReason::Invalid)) {
            return RejectionReason::Invalid;
        }

        return $reasons->first(fn (?RejectionReason $reason) => $reason !== null);
    }

    /** @param array<string, mixed> $raw */
    private function hasRequiredCombination(OperationSpec $spec, array $raw): bool
    {
        return match ($spec->type) {
            OperationType::ExerciseAssist => array_key_exists('assisted', $raw) || array_key_exists('solutionSeen', $raw),
            OperationType::ExerciseDraft => ($raw['code'] ?? null) !== null || ($raw['starterHash'] ?? null) === null,
            default => true,
        };
    }

    /**
     * @param  array<string, mixed>  $raw
     * @return array<string, string|int|bool|null>
     */
    private function values(OperationSpec $spec, array $raw): array
    {
        $names = collect($spec->fields)->map(fn (FieldSpec $field) => $field->name)->reject(fn (string $name) => $name === 'contentVersion');
        $values = [];
        foreach ($raw as $name => $value) {
            if ($names->contains($name) && (is_string($value) || is_int($value) || is_bool($value) || $value === null)) {
                $values[$name] = $value;
            }
        }

        return $values;
    }
}
