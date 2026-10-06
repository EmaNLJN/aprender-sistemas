<?php

namespace App\Accounts;

final class UserData
{
    /** @var list<string> */
    private const EXPORT_KEYS = ['account', 'exerciseProgress', 'attempts', 'progress', 'imports'];

    /** @param list<UserTable>|null $tables */
    public function __construct(private ?array $tables = null) {}

    /** @return list<UserTable> */
    public function tables(): array
    {
        return $this->tables ?? UserTables::all();
    }

    /** @return list<UserTable> */
    public function batchTables(): array
    {
        $batched = [];
        foreach ($this->tables() as $table) {
            if ($table->batchesBy !== null) {
                $batched[] = $table;
            }
        }

        return $batched;
    }

    /** @return list<string> */
    public function exportKeys(): array
    {
        return self::EXPORT_KEYS;
    }
}
