<?php

namespace Tests\Support;

use App\Accounts\UserData;
use App\Accounts\UserTable;
use Illuminate\Support\Facades\DB;

final class UserDataCoverage
{
    /** @return list<string> the tables of the account that the registry does not declare */
    public static function undeclared(?UserData $data = null): array
    {
        $declared = array_map(fn (UserTable $table) => $table->name, ($data ?? new UserData)->tables());

        return array_values(array_diff(self::accountTables(), $declared));
    }

    /** @return list<string> the tables with a user_id column, and those that reference a table already in the set */
    public static function accountTables(): array
    {
        $tables = self::names(DB::select("select table_name as v from information_schema.columns where table_schema = database() and column_name = 'user_id'"));
        $references = DB::select('select table_name as child, referenced_table_name as parent from information_schema.key_column_usage where table_schema = database() and referenced_table_name is not null');

        do {
            $before = count($tables);
            foreach ($references as $reference) {
                if (in_array($reference->parent, $tables, true) && ! in_array($reference->child, $tables, true)) {
                    $tables[] = $reference->child;
                }
            }
        } while (count($tables) > $before);

        sort($tables);

        return $tables;
    }

    public static function exists(string $table): bool
    {
        return DB::scalar('select count(*) from information_schema.tables where table_schema = database() and table_name = ?', [$table]) === 1;
    }

    public static function rowsOf(UserTable $table, int $userId): int
    {
        if (self::hasUserId($table->name)) {
            return self::count("select count(*) from `{$table->name}` where `user_id` = ?", $userId);
        }

        $link = DB::selectOne(
            'select column_name as child_column, referenced_column_name as parent_column from information_schema.key_column_usage
             where table_schema = database() and table_name = ? and referenced_table_name = ? limit 1',
            [$table->name, $table->parent],
        );

        return self::count(
            "select count(*) from `{$table->name}` where `{$link->child_column}` in (select `{$link->parent_column}` from `{$table->parent}` where `user_id` = ?)",
            $userId,
        );
    }

    private static function hasUserId(string $table): bool
    {
        return DB::scalar("select count(*) from information_schema.columns where table_schema = database() and table_name = ? and column_name = 'user_id'", [$table]) === 1;
    }

    private static function count(string $sql, int $userId): int
    {
        $count = DB::scalar($sql, [$userId]);

        return is_numeric($count) ? (int) $count : 0;
    }

    /**
     * @param  list<object>  $rows
     * @return list<string>
     */
    private static function names(array $rows): array
    {
        $names = [];
        foreach ($rows as $row) {
            $names[] = $row->v;
        }

        return $names;
    }
}
