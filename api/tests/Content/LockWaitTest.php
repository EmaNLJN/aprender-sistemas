<?php

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Pdo\Mysql;

// FR-042 y SC-007: con la espera acotada que le da compose.yaml al servicio migrate, una migración
// detrás de una transacción abierta falla en 5 segundos en lugar de esperar hasta un año (el
// valor por omisión de lock_wait_timeout). La conexión de esta prueba lleva la misma opción que
// el servicio: MYSQL_ATTR_INIT_COMMAND de config/database.php.
it('una migración detrás de una transacción abierta falla en 5 segundos o menos, con el error 1205', function () {
    $config = config('database.connections.mysql');
    config(['database.connections.mysql.options' => [
        Mysql::ATTR_INIT_COMMAND => 'SET SESSION lock_wait_timeout=5, innodb_lock_wait_timeout=5',
    ]]);
    DB::purge('mysql');
    $holder = DB::connectUsing('holder', $config, true);
    $holder->beginTransaction();
    // Una lectura toma el bloqueo de metadatos compartido de la tabla hasta el final de la transacción.
    $holder->select('select * from exercises limit 1');

    $started = microtime(true);
    try {
        DB::statement("alter table exercises comment = 'probe'");
        $this->fail('se esperaba que la migración no consiguiera el bloqueo');
    } catch (QueryException $error) {
        expect((int) $error->errorInfo[1])->toBe(1205);
    } finally {
        $holder->rollBack();
        config(['database.connections.mysql' => $config]);
        DB::purge('mysql');
    }

    expect(microtime(true) - $started)->toBeLessThan(8.0);
});
