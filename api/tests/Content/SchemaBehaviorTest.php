<?php

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

// Lo que el esquema hace, no sólo lo que declara: sus CHECK rechazan y sus claves foráneas no
// dejan borrar. Contra MySQL real, sin transacción de prueba (DatabaseTruncation).
function mysqlErrorCode(QueryException $error): int
{
    return (int) $error->errorInfo[1];
}

$now = '2026-10-05 00:00:00.000';

it('los CHECK rechazan una fila que rompe su regla (error 3819)', function (string $table, array $row) {
    try {
        DB::table($table)->insert($row);
        $this->fail('se esperaba que el CHECK rechazara la fila');
    } catch (QueryException $error) {
        expect(mysqlErrorCode($error))->toBe(3819);
    }
})->with(function () use ($now) {
    $lifecycle = ['created_at' => $now, 'updated_at' => $now];

    return [
        'activo con fecha de retiro' => ['catalogs', ['code' => 'a', 'slice_by' => 'language', 'status' => 'active', 'retired_at' => $now] + $lifecycle],
        'retirado sin fecha de retiro' => ['catalogs', ['code' => 'a', 'slice_by' => 'language', 'status' => 'deprecated'] + $lifecycle],
        'posición de la cadena en cero' => ['catalogs', ['code' => 'a', 'slice_by' => 'language', 'chain_position' => 0] + $lifecycle],
        'un catálogo retirado en la cadena' => ['catalogs', ['code' => 'a', 'slice_by' => 'language', 'status' => 'deprecated', 'retired_at' => $now, 'chain_position' => 1] + $lifecycle],
        'hash de documento en mayúsculas' => ['content_imports', ['document_hash' => str_repeat('A', 64), 'portion_hashes' => '{}', 'counts' => '{}', 'changes' => '{}', 'created_at' => $now]],
        'commit de 41 caracteres' => ['content_imports', ['document_hash' => str_repeat('a', 64), 'source_commit' => str_repeat('a', 41), 'portion_hashes' => '{}', 'counts' => '{}', 'changes' => '{}', 'created_at' => $now]],
        'recurso destacado con 2' => ['guide_resources', [
            'id' => 'r', 'position' => 0, 'title' => 't', 'url' => 'u', 'languages_json' => '["rust"]', 'category' => 'lectura', 'cost' => 'gratis',
            'format' => 'f', 'description' => 'd', 'why' => 'w', 'caveat' => 'c', 'featured' => 2, 'key_order' => '[]',
        ] + $lifecycle],
        'fuente de la guía con key_order que no es JSON' => ['guide_sources', ['position' => 0, 'title' => 't', 'url' => 'u', 'note' => 'n', 'key_order' => 'no es json'] + $lifecycle],
    ];
});

it('las claves foráneas no dejan borrar lo que otro referencia (RESTRICT)', function () {
    $now = '2026-10-05 00:00:00.000';
    DB::table('languages')->insert(['code' => 'rust', 'position' => 1]);
    DB::table('topics')->insert(['language' => 'rust', 'topic_key' => 'basics', 'label' => 'Básicos', 'created_at' => $now, 'updated_at' => $now]);

    try {
        DB::table('languages')->where('code', 'rust')->delete();
        $this->fail('se esperaba que RESTRICT impidiera el borrado');
    } catch (QueryException $error) {
        expect(mysqlErrorCode($error))->toBe(1451);
    }
    try {
        DB::table('languages')->where('code', 'rust')->update(['code' => 'rs']);
        $this->fail('se esperaba que RESTRICT impidiera el cambio de clave');
    } catch (QueryException $error) {
        expect(mysqlErrorCode($error))->toBe(1451);
    }
});

it('los IDs comparan byte a byte: «Lab» y «lab» son catálogos distintos', function () {
    $now = '2026-10-05 00:00:00.000';
    foreach (['lab', 'Lab'] as $code) {
        DB::table('catalogs')->insert(['code' => $code, 'slice_by' => 'language', 'created_at' => $now, 'updated_at' => $now]);
    }

    expect(DB::table('catalogs')->count())->toBe(2);
});
