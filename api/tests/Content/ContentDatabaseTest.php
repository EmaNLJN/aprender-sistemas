<?php

use Illuminate\Support\Facades\DB;
use Tests\Support\ContentDatabase;

// ContentDatabase es el oráculo de las pruebas del import y de la entrega: si miente, esas pruebas
// pasan sin comprobar nada. Estas le piden lo mismo que ellas.
it('counts da las 21 tablas, vacías, en el orden de sus migraciones', function () {
    $counts = ContentDatabase::counts();

    expect(array_keys($counts))->toBe(ContentDatabase::TABLES)
        ->and(count($counts))->toBe(21)
        ->and(array_sum($counts))->toBe(0);
});

it('checksums cambia sólo en la tabla que cambió', function () {
    $before = ContentDatabase::checksums();
    DB::table('languages')->insert(['code' => 'rust', 'position' => 1]);
    $after = ContentDatabase::checksums();

    expect(array_keys($before))->toBe(ContentDatabase::TABLES)
        ->and(array_keys(array_diff_assoc($after, $before)))->toBe(['languages']);
});

it('contentWritesDuring ve toda escritura a una tabla de contenido, TRUNCATE incluido, y nada más', function () {
    $writes = ContentDatabase::contentWritesDuring(function () {
        DB::table('languages')->insert(['code' => 'go', 'position' => 2]);
        DB::table('languages')->upsert([['code' => 'go', 'position' => 3]], ['code'], ['position']);
        DB::table('languages')->where('code', 'go')->update(['position' => 4]);
        DB::table('exercise_hints')->truncate();
        DB::table('languages')->where('code', 'zz')->delete();
        // Lo que no escribe contenido: una lectura y la caché.
        DB::table('languages')->count();
        DB::table('cache')->upsert([['key' => 'k', 'value' => 'v', 'expiration' => 1]], ['key'], ['value', 'expiration']);
    });

    expect($writes)->toHaveCount(5)
        ->and($writes[0])->toStartWith('insert into `languages`')
        ->and($writes[1])->toContain('on duplicate key update')
        ->and($writes[2])->toStartWith('update `languages`')
        ->and($writes[3])->toBe('truncate table `exercise_hints`')
        ->and($writes[4])->toStartWith('delete from `languages`');
});
