<?php

use Illuminate\Support\Facades\DB;

it('uses the MySQL test database even if the environment points to the development one', function () {
    expect(DB::connection()->getDriverName())->toBe('mysql')
        ->and(DB::connection()->getConfig('host'))->toBe('mysql-test')
        ->and(DB::connection()->getDatabaseName())->toStartWith('taller_test');
});

it('creates tables with the Spanish collation', function () {
    $table = DB::selectOne(
        'select table_collation as collation_name from information_schema.tables where table_schema = database() and table_name = ?',
        ['migrations'],
    );

    expect($table->collation_name)->toBe('utf8mb4_es_0900_ai_ci');
});

it('compares Spanish text: ñ is a different letter and accents do not count', function () {
    $row = DB::selectOne("select 'año' = 'ano' as n_tilde_is_n, 'canción' = 'cancion' as accent_ignored");

    expect((int) $row->n_tilde_is_n)->toBe(0)
        ->and((int) $row->accent_ignored)->toBe(1);
});

it('creates the database with the Spanish collation also for what Laravel does not create', function () {
    $schema = DB::selectOne(
        'select default_collation_name as collation_name from information_schema.schemata where schema_name = database()',
    );

    expect($schema->collation_name)->toBe('utf8mb4_es_0900_ai_ci');
});
