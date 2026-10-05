<?php

namespace App\Content\Codec;

use App\Content\InvalidContent;
use App\Content\PublishedJson;
use LogicException;
use stdClass;

/**
 * La regla de cada clave publicada de un tipo de registro: a qué columna va y de qué tipo. La
 * usan las dos direcciones, el import (`toColumns`) y la entrega (`fromColumns`), así que cada
 * regla se escribe una sola vez (ADR 0006 D10). Las claves «derivadas» no van en una columna del
 * registro: salen de una tabla hija o de otra tabla, y las resuelve cada códec.
 */
final class FieldMap
{
    /**
     * @param  array<string, Field>  $fields  clave publicada → campo
     * @param  list<string>  $derived  claves publicadas que salen de otra tabla
     */
    public function __construct(private readonly array $fields, private readonly array $derived = []) {}

    /** Las claves de un registro, en el orden en que se publican. */
    public static function keysOf(stdClass $record): array
    {
        return array_map('strval', array_keys(get_object_vars($record)));
    }

    /**
     * Las columnas de un registro del documento. Rechaza una clave sin regla y una clave obligatoria
     * que falta; las derivadas se ignoran.
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
     * El registro tal como se publica, con las claves en el orden de `$keyOrder`.
     *
     * @param  array<string, mixed>  $row
     * @param  list<string>  $keyOrder
     * @param  array<string, mixed>  $derived  el valor de cada clave derivada
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
