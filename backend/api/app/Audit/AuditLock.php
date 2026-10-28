<?php

namespace App\Audit;

use Illuminate\Support\Facades\DB;

final class AuditLock
{
    private const NAME = "concat(database(), ':curriculum-audit')";

    public function acquire(): void
    {
        if (! in_array(DB::scalar('select get_lock('.self::NAME.', 0)'), [1, '1'], true)) {
            throw AuditRefused::alreadyRunning();
        }
    }

    public function release(): void
    {
        DB::scalar('select release_lock('.self::NAME.')');
    }
}
