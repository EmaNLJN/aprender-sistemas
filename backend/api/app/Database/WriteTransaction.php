<?php

namespace App\Database;

use Closure;
use Illuminate\Support\Facades\DB;

final class WriteTransaction
{
    /**
     * `SET TRANSACTION` would cover only the first attempt and is invisible in `@@transaction_isolation`,
     * so the session level is changed for the whole call and restored afterwards.
     *
     * @template T
     *
     * @param  Closure(): T  $callback
     * @return T
     */
    public static function run(Closure $callback): mixed
    {
        $previousLevel = self::sessionIsolationLevel();
        DB::statement('SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED');

        try {
            return DB::transaction($callback, attempts: 3);
        } finally {
            DB::statement('SET SESSION TRANSACTION ISOLATION LEVEL '.str_replace('-', ' ', $previousLevel));
        }
    }

    private static function sessionIsolationLevel(): string
    {
        $level = DB::scalar('select @@transaction_isolation');

        return is_string($level) ? $level : 'REPEATABLE-READ';
    }
}
