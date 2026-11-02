<?php

namespace App\Stats;

use App\Content\Record\RowFields;
use App\Http\StatsTimeout;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use LogicException;

final class StatsRows
{
    private const QUERY_TIMEOUT = 3024;

    /**
     * @param  list<int|string|null>  $bindings
     * @return list<RowFields>
     */
    public function select(string $sql, array $bindings, string $source): array
    {
        $limited = preg_replace('/^\s*select\b/i', 'select /*+ MAX_EXECUTION_TIME('.config()->integer('stats.max_execution_ms').') */', $sql, 1, $replaced);
        if (! is_string($limited) || $replaced !== 1) {
            throw new LogicException('StatsRows only runs SELECT statements.');
        }
        $started = hrtime(true);
        try {
            $rows = DB::select($limited, $bindings);
        } catch (QueryException $error) {
            if (($error->errorInfo[1] ?? null) === self::QUERY_TIMEOUT) {
                throw StatsTimeout::after(intdiv(hrtime(true) - $started, 1_000_000));
            }
            throw $error;
        }
        $fields = [];
        foreach ($rows as $row) {
            $fields[] = new RowFields(get_object_vars($row), $source);
        }

        return $fields;
    }

    /** @param  list<int|string|null>  $bindings */
    public function one(string $sql, array $bindings, string $source): RowFields
    {
        $rows = $this->select($sql, $bindings, $source);
        if (count($rows) !== 1) {
            throw new LogicException("Expected exactly one row from {$source}.");
        }

        return $rows[0];
    }
}
