<?php

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\Support\ContentDatabase;

// Un DDL confirma la transacción: estas pruebas no pueden correr bajo RefreshDatabase.
/** @return array<string, string> el CREATE TABLE de cada tabla de contenido, sin su contador de AUTO_INCREMENT */
function createStatements(): array
{
    $statements = [];
    foreach (ContentDatabase::TABLES as $table) {
        $statement = DB::selectOne("show create table `{$table}`")->{'Create Table'};
        // El contador no es esquema: un import revertido deja content_imports vacía con el
        // contador corrido (AUTO_INCREMENT=2), y DatabaseTruncation no trunca una tabla vacía.
        $statements[$table] = preg_replace('/ AUTO_INCREMENT=\d+/', '', $statement);
    }

    return $statements;
}

it('migrate, rollback y migrate dejan el mismo esquema (H)', function () {
    $before = createStatements();

    try {
        // Las 21 migraciones de contenido son las últimas: se deshacen sin tocar las de C1.
        expect(Artisan::call('migrate:rollback', ['--step' => 21, '--force' => true]))->toBe(0);
        expect(Schema::hasTable('exercises'))->toBeFalse();
    } finally {
        expect(Artisan::call('migrate', ['--force' => true]))->toBe(0);
    }

    expect(createStatements())->toBe($before);
});

// El down() de cada migración es un DROP TABLE y nada más: con las hijas en pie, MySQL tiene que
// negarse. Un down() que desactivara las claves foráneas dejaría huérfanas a sus hijas.
it('el down() de una tabla referenciada falla mientras sus hijas existan (error 3730)', function () {
    $migration = require database_path('migrations/2026_10_05_100006_create_exercises_table.php');

    try {
        $migration->down();
        $this->fail('se esperaba que MySQL impidiera borrar la tabla referenciada');
    } catch (QueryException $error) {
        expect((int) $error->errorInfo[1])->toBe(3730);
    }
    expect(Schema::hasTable('exercises'))->toBeTrue();
});
