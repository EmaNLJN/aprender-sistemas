<?php

use Illuminate\Support\Facades\DB;

// El servicio test de compose.yaml recibe el entorno de producción (DB_HOST=mysql,
// DB_DATABASE=taller): phpunit.xml tiene que imponer la base de pruebas igual.
it('usa la base MySQL de pruebas aunque el entorno apunte a la de desarrollo', function () {
    expect(DB::connection()->getDriverName())->toBe('mysql')
        ->and(DB::connection()->getConfig('host'))->toBe('mysql-test')
        ->and(DB::connection()->getDatabaseName())->toStartWith('taller_test');
});

it('crea las tablas con la colación española', function () {
    $table = DB::selectOne(
        'select table_collation as collation_name from information_schema.tables where table_schema = database() and table_name = ?',
        ['migrations'],
    );

    expect($table->collation_name)->toBe('utf8mb4_es_0900_ai_ci');
});

it('compara textos en español: la ñ es otra letra y los acentos no cuentan', function () {
    $row = DB::selectOne("select 'año' = 'ano' as enie_es_ene, 'canción' = 'cancion' as acento_ignorado");

    expect((int) $row->enie_es_ene)->toBe(0)
        ->and((int) $row->acento_ignorado)->toBe(1);
});
