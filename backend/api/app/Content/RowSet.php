<?php

namespace App\Content;

use Illuminate\Support\Arr;

/**
 * The content rows of every table in ContentTables, each keyed by its primary key. Data columns
 * only: the lifecycle (status, retired_at, created_at, updated_at) is set by the writer.
 */
final class RowSet
{
    /** @var array<string, array<string, array<string, int|string|null>>> */
    private array $tables;

    public function __construct()
    {
        $this->tables = Arr::map(ContentTables::KEYS, fn () => []);
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

    /** @return array<string, array<string, int|string|null>> */
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
        return Arr::map($this->tables, fn (array $keyed) => array_values($keyed));
    }
}
