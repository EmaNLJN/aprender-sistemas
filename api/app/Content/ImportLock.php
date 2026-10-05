<?php

namespace App\Content;

use Illuminate\Support\Facades\DB;

/**
 * The MySQL lock that keeps two `content:import` from running at once (ADR 0006 D12). GET_LOCK with
 * a 0 timeout returns 0 if another session holds it, so the command exits with an error instead
 * of skipping the import. It lives in the connection's session: if the connection is reopened it
 * is lost, so it has to be checked again before opening the transaction.
 */
final class ImportLock
{
    /** `<database>:content-import`: two databases on the same server do not block each other. */
    private const NAME = "concat(database(), ':content-import')";

    public function acquire(): bool
    {
        return (int) DB::scalar('select get_lock('.self::NAME.', 0)') === 1;
    }

    /** Whether the lock still belongs to this connection. */
    public function stillHeld(): bool
    {
        return (int) DB::scalar('select is_used_lock('.self::NAME.') = connection_id()') === 1;
    }

    public function release(): void
    {
        DB::scalar('select release_lock('.self::NAME.')');
    }
}
