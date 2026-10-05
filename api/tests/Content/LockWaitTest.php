<?php

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Pdo\Mysql;

// FR-042, SC-007: with the lock wait bounded as compose.yaml does for the migrate service (MYSQL_ATTR_INIT_COMMAND),
// a migration behind an open transaction fails in 5 s instead of waiting a year (the lock_wait_timeout default).
it('a migration behind an open transaction fails in 5 seconds or less, with error 1205', function () {
    $config = config('database.connections.mysql');
    config(['database.connections.mysql.options' => [
        Mysql::ATTR_INIT_COMMAND => 'SET SESSION lock_wait_timeout=5, innodb_lock_wait_timeout=5',
    ]]);
    DB::purge('mysql');
    $holder = DB::connectUsing('holder', $config, true);
    $holder->beginTransaction();
    // A read takes the table's shared metadata lock until the transaction ends.
    $holder->select('select * from exercises limit 1');

    $started = microtime(true);
    try {
        DB::statement("alter table exercises comment = 'probe'");
        $this->fail('expected the migration to fail to get the lock');
    } catch (QueryException $error) {
        expect((int) $error->errorInfo[1])->toBe(1205);
    } finally {
        $holder->rollBack();
        config(['database.connections.mysql' => $config]);
        DB::purge('mysql');
    }

    expect(microtime(true) - $started)->toBeLessThan(8.0);
});
