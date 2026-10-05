<?php

namespace App\Content\Record;

use LogicException;

final readonly class RowFields
{
    /** @param array<string, mixed> $row */
    public function __construct(private array $row, private string $table) {}

    public function string(string $column): string
    {
        $value = $this->value($column);
        if (! is_string($value)) {
            throw $this->unexpected($column, 'un texto', $value);
        }

        return $value;
    }

    public function nullableString(string $column): ?string
    {
        return $this->value($column) === null ? null : $this->string($column);
    }

    public function int(string $column): int
    {
        $value = $this->value($column);
        if (is_int($value)) {
            return $value;
        }
        if (is_string($value) && preg_match('/\A-?\d+\z/', $value) === 1) {
            return (int) $value;
        }
        throw $this->unexpected($column, 'un entero', $value);
    }

    public function nullableInt(string $column): ?int
    {
        return $this->value($column) === null ? null : $this->int($column);
    }

    public function flag(string $column): bool
    {
        return match ($this->int($column)) {
            0 => false,
            1 => true,
            default => throw $this->unexpected($column, '0 o 1', $this->value($column)),
        };
    }

    public function json(string $column): JsonValue
    {
        return JsonValue::fromRow($this->string($column));
    }

    public function nullableJson(string $column): ?JsonValue
    {
        return $this->value($column) === null ? null : $this->json($column);
    }

    /** @param list<string> $known the published keys of the record */
    public function keyOrder(array $known): KeyOrder
    {
        return KeyOrder::fromRow($this->string('key_order'), $known);
    }

    private function value(string $column): mixed
    {
        if (! array_key_exists($column, $this->row)) {
            throw new LogicException("{$this->table}: a la fila le falta la columna {$column}");
        }

        return $this->row[$column];
    }

    private function unexpected(string $column, string $expected, mixed $value): LogicException
    {
        return new LogicException("{$this->table}.{$column}: se esperaba {$expected} y la fila trae ".get_debug_type($value));
    }
}
