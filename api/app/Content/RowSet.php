<?php

namespace App\Content;

/**
 * Las filas de contenido de todas las tablas de ContentTables, cada una por su clave primaria.
 * Sólo las columnas de datos: el ciclo de vida (status, retired_at, created_at, updated_at) lo
 * pone el escritor.
 */
final class RowSet
{
    /** @var array<string, array<string, array<string, int|string|null>>> */
    private array $tables;

    public function __construct()
    {
        $this->tables = array_fill_keys(array_keys(ContentTables::KEYS), []);
    }

    /** @param array<string, int|string|null> $row */
    public function add(string $table, array $row): void
    {
        $key = ContentTables::keyOf($table, $row);
        if (isset($this->tables[$table][$key])) {
            throw InvalidContent::at('curriculum.json', $table, 'la clave «'.str_replace("\x1f", ' / ', $key).'» se repite');
        }
        $this->tables[$table][$key] = $row;
    }

    /** @param array<string, list<array<string, int|string|null>>> $byTable */
    public function addAll(array $byTable): void
    {
        foreach ($byTable as $table => $rows) {
            foreach ($rows as $row) {
                $this->add($table, $row);
            }
        }
    }

    /** @return array<string, array<string, int|string|null>> por clave primaria */
    public function keyed(string $table): array
    {
        return $this->tables[$table];
    }

    /** @return list<array<string, int|string|null>> */
    public function rows(string $table): array
    {
        return array_values($this->tables[$table]);
    }

    /** @return array<string, list<array<string, int|string|null>>> */
    public function toArray(): array
    {
        return array_map('array_values', $this->tables);
    }
}
