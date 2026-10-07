<?php

namespace App\Progress\Merge;

use App\Runs\Record\Instant;
use Carbon\CarbonImmutable;
use LogicException;

final class UpsertSql
{
    private const TABLES_WITHOUT_UPDATED_AT = ['workshop_observations'];

    /**
     * @param  array<string, string>  $key  the primary key columns after user_id, with their values
     * @param  non-empty-list<FieldWrite>  $writes  every group of one row, all of the same table
     */
    public static function row(int $userId, array $key, array $writes, int $revision, CarbonImmutable $now): SqlStatement
    {
        $table = $writes[0]->kind->table;
        $hasUpdatedAt = ! in_array($table, self::TABLES_WITHOUT_UPDATED_AT, true);
        $stamp = Instant::format($now);

        $columns = ['user_id', ...array_keys($key)];
        $bindings = [$userId, ...array_values($key)];
        $assignments = [];
        $changes = [];
        foreach ($writes as $write) {
            if ($write->kind->table !== $table) {
                throw new LogicException('Una sentencia escribe una sola tabla.');
            }
            $group = new GroupSql($table, $write);
            $columns = [...$columns, ...$write->kind->columns];
            $bindings = [...$bindings, ...$write->values];
            if ($write->kind->clockColumn !== null) {
                $columns[] = $write->kind->clockColumn;
                $bindings[] = $write->at === null ? null : Instant::format($write->at);
            }
            $assignments = [...$assignments, ...$group->assignments()];
            $changes[] = $group->changes();
        }
        $guard = count($changes) === 1 ? $changes[0] : collect($changes)->map(fn (string $change) => "({$change})")->implode(' OR ');

        $columns = [...$columns, 'revision', 'created_at'];
        $bindings = [...$bindings, $revision, $stamp];
        $stamped = [self::guarded('revision', $table, $guard)];
        if ($hasUpdatedAt) {
            $columns[] = 'updated_at';
            $bindings[] = $stamp;
            $stamped[] = self::guarded('updated_at', $table, $guard);
        }

        return new SqlStatement(self::insert($table, $columns, [...$stamped, ...$assignments]), $bindings);
    }

    public static function workshopParent(int $userId, string $workshopId, string $language, int $revision, CarbonImmutable $now): SqlStatement
    {
        $stamp = Instant::format($now);
        $sql = self::insert(
            'workshop_progress',
            ['user_id', 'workshop_id', 'language', 'revision', 'created_at', 'updated_at'],
            ['`user_id` = `workshop_progress`.`user_id`'],
        );

        return new SqlStatement($sql, [$userId, $workshopId, $language, $revision, $stamp, $stamp]);
    }

    /**
     * @param  list<string>  $columns
     * @param  list<string>  $assignments
     */
    private static function insert(string $table, array $columns, array $assignments): string
    {
        $names = collect($columns)->map(fn (string $column) => "`{$column}`")->implode(', ');
        $placeholders = implode(', ', array_fill(0, count($columns), '?'));

        return "INSERT INTO `{$table}` ({$names}) VALUES ({$placeholders}) AS `n` ON DUPLICATE KEY UPDATE ".implode(', ', $assignments);
    }

    private static function guarded(string $column, string $table, string $guard): string
    {
        return "`{$column}` = IF({$guard}, `n`.`{$column}`, `{$table}`.`{$column}`)";
    }
}
