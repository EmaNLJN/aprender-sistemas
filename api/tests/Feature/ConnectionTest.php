<?php

use Illuminate\Support\Facades\DB;

// ADR 0006 D04 y D09: la conexión trabaja en UTC y los upserts usan alias de fila, porque
// VALUES() dentro de ON DUPLICATE KEY UPDATE está deprecado.
it('trabaja en UTC', function () {
    expect(DB::scalar('select @@session.time_zone'))->toBe('+00:00');
});

it('compila los upserts con alias de fila y no con VALUES()', function () {
    $statements = [];
    DB::listen(function ($query) use (&$statements) {
        $statements[] = $query->sql;
    });

    DB::table('cache')->upsert([['key' => 'prueba', 'value' => 'x', 'expiration' => 1]], ['key'], ['value', 'expiration']);

    expect(implode("\n", $statements))->toContain('as laravel_upsert_alias')->not->toContain('values(`');
});

// El servicio migrate espera como mucho 5 s por un bloqueo (D35); php conserva los valores por
// omisión. phpunit.xml no define MYSQL_ATTR_INIT_COMMAND: ésta es la conexión de php.
it('no acota la espera de bloqueos de la conexión de php', function () {
    expect((int) DB::scalar('select @@session.lock_wait_timeout'))->toBeGreaterThan(5)
        ->and((int) DB::scalar('select @@session.innodb_lock_wait_timeout'))->toBe(50);
});
