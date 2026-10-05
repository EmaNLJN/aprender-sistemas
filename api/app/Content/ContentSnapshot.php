<?php

namespace App\Content;

use Closure;
use Illuminate\Support\Facades\DB;

/**
 * A consistent read of the content: a read-only REPEATABLE READ transaction in which the first
 * query pins the snapshot (the latest import), so every table the caller reads belongs to the same
 * import even if another one commits in between. Writing to the cache goes after it closes: a
 * read-only transaction accepts no writes.
 */
final class ContentSnapshot
{
    public static function read(Closure $callback): mixed
    {
        // Inside an open transaction (tests under RefreshDatabase) the read happens in that one.
        if (DB::transactionLevel() > 0) {
            return $callback();
        }
        DB::statement('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
        DB::beginTransaction();
        try {
            return $callback();
        } finally {
            DB::rollBack();
        }
    }
}
