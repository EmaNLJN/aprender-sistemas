<?php

namespace App\Content\Codec;

use App\Content\InvalidContent;
use App\Content\PublishedJson;
use LogicException;
use stdClass;

/**
 * The rule of each published key of a record type: which column it goes to and its type. Both
 * directions use it, the import (`toColumns`) and the delivery (`fromColumns`), so each rule is
 * written once (ADR 0006 D10). "Derived" keys have no column in the record: they come from a
 * child table or another table, and each codec resolves them.
 */
final class FieldMap
{
    /**
     * @param  array<string, Field>  $fields  published key → field
     * @param  list<string>  $derived  published keys that come from another table
     */
    public function __construct(private readonly array $fields, private readonly array $derived = []) {}

    public static function keysOf(stdClass $record): array
    {
        return array_map('strval', array_keys(get_object_vars($record)));
    }

    /**
     * The columns of a document record. Rejects a key without a rule and a missing required key;
     * derived keys are ignored.
     *
     * @return array<string, int|string|null>
     */
    public function toColumns(stdClass $record, string $path): array
    {
        foreach (self::keysOf($record) as $key) {
            if (! isset($this->fields[$key]) && ! in_array($key, $this->derived, true)) {
                throw InvalidContent::at('curriculum.json', "{$path}.{$key}", 'clave desconocida');
            }
        }
        $columns = [];
        foreach ($this->fields as $key => $field) {
            if (! property_exists($record, $key)) {
                if (! $field->optional) {
                    throw InvalidContent::at('curriculum.json', $path, "falta la clave «{$key}»");
                }
                $columns[$field->column] = null;

                continue;
            }
            $columns[$field->column] = $this->toColumn($record->{$key}, $field, "{$path}.{$key}");
        }

        return $columns;
    }

    /**
     * The record as published, with its keys in the order of `$keyOrder`.
     *
     * @param  array<string, mixed>  $row
     * @param  list<string>  $keyOrder
     * @param  array<string, mixed>  $derived  the value of each derived key
     */
    public function fromColumns(array $row, array $keyOrder, array $derived = []): stdClass
    {
        $record = new stdClass;
        foreach ($keyOrder as $key) {
            if (isset($this->fields[$key])) {
                $record->{$key} = $this->fromColumn($row[$this->fields[$key]->column], $this->fields[$key]);
            } elseif (array_key_exists($key, $derived)) {
                $record->{$key} = $derived[$key];
            } else {
                throw new LogicException("La clave «{$key}» no tiene regla en su códec.");
            }
        }

        return $record;
    }

    private function toColumn(mixed $value, Field $field, string $path): int|string
    {
        $problem = match ($field->type) {
            FieldType::Text => is_string($value) && trim($value) !== '' ? null : 'se esperaba un texto no vacío',
            FieldType::Number => is_int($value) ? null : 'se esperaba un entero',
            FieldType::Flag => is_bool($value) ? null : 'se esperaba true o false',
            FieldType::Json => null,
        };
        if ($problem !== null) {
            throw InvalidContent::at('curriculum.json', $path, $problem);
        }

        return match ($field->type) {
            FieldType::Text, FieldType::Number => $value,
            FieldType::Flag => (int) $value,
            FieldType::Json => PublishedJson::encode($value),
        };
    }

    private function fromColumn(mixed $value, Field $field): mixed
    {
        if ($value === null) {
            return null;
        }

        return match ($field->type) {
            FieldType::Text => (string) $value,
            FieldType::Number => (int) $value,
            FieldType::Flag => (bool) $value,
            FieldType::Json => PublishedJson::decode((string) $value),
        };
    }
}
