<?php

namespace App\Accounts\Export;

use App\Runs\Record\Instant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class RowShape
{
    /** @var array<string, list<string>> */
    private static array $dateColumnsByTable = [];

    /**
     * @param  array<string, mixed>  $row
     * @param  list<string>  $dateColumns
     * @param  list<string>  $without
     * @return array<string, mixed>
     */
    public static function of(array $row, array $dateColumns, array $without): array
    {
        $shaped = [];
        foreach ($row as $column => $value) {
            if (in_array($column, $without, true)) {
                continue;
            }
            $isDate = in_array($column, $dateColumns, true) && is_string($value);
            $shaped[Str::camel($column)] = $isDate ? Instant::iso(Instant::parse($value)) : $value;
        }

        return $shaped;
    }

    /** @return list<string> */
    public static function dateColumnsOf(string $table): array
    {
        if (! isset(self::$dateColumnsByTable[$table])) {
            $columns = DB::table('information_schema.columns')
                ->where('table_schema', DB::raw('database()'))
                ->where('table_name', $table)
                ->where('data_type', 'datetime')
                ->orderBy('ordinal_position')
                ->pluck('column_name as name');
            $names = [];
            foreach ($columns as $name) {
                $names[] = is_string($name) ? $name : '';
            }
            self::$dateColumnsByTable[$table] = $names;
        }

        return self::$dateColumnsByTable[$table];
    }
}
