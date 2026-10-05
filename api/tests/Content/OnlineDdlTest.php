<?php

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

// Medición de ADR 0006 D07 contra el mysql:9.7 fijado en compose.yaml: si un CHECK sobre DATETIME
// impide que ampliar un ENUM o agregar una columna sea INSTANT (bugs #117450 y #121124), el
// invariante de las tablas que crecen (runs, attempts, exercise_progress…) queda en el escritor.
// Cada caso fija ALGORITHM y LOCK para que MySQL falle en lugar de copiar la tabla. INSTANT sólo
// admite LOCK=DEFAULT: con NONE, SHARED o EXCLUSIVE MySQL responde 1221 («Incorrect usage») sin
// mirar la operación, y esa respuesta no mide nada. Se prueba con una tabla de descarte, nunca
// con una de contenido. D07_MEASURED es lo que midió MySQL: «ok» si aceptó el DDL con ese
// algoritmo, o el código del error si lo rechazó (1845 y 1846: no se puede sin copiar la tabla).
// Si la imagen cambia y el resultado también, esta prueba falla: hay que revisar la decisión de
// D07 antes de actualizarlo.
const D07_MEASURED = [
    'ampliar un ENUM al final, con un CHECK sobre DATETIME en la tabla' => '1845',
    'ADD COLUMN en una tabla con un CHECK sobre DATETIME' => 'ok',
    'ADD COLUMN con su propio CHECK' => '1845',
    'ADD FOREIGN KEY sobre una tabla con filas, con las comprobaciones activas' => '1846',
];

function ddlOutcome(string $statement): string
{
    try {
        DB::statement($statement);

        return 'ok';
    } catch (QueryException $error) {
        return (string) $error->errorInfo[1];
    }
}

beforeEach(function () {
    DB::statement('drop table if exists d07_child');
    DB::statement('drop table if exists d07_probe');
    DB::statement("create table d07_probe (id int unsigned not null primary key, state enum('a','b') not null, seen datetime(3) not null, constraint d07_probe_seen_check check (seen > '2000-01-01')) engine=InnoDB");
    DB::statement("insert into d07_probe values (1, 'a', now(3)), (2, 'b', now(3))");
    DB::statement('create table d07_child (id int unsigned not null primary key, probe_id int unsigned not null, key d07_child_probe_index (probe_id)) engine=InnoDB');
    DB::statement('insert into d07_child values (1, 1), (2, 2)');
});

afterEach(function () {
    DB::statement('drop table if exists d07_child');
    DB::statement('drop table if exists d07_probe');
});

it('mide los cuatro casos de D07 en mysql:9.7', function () {
    $measured = [
        'ampliar un ENUM al final, con un CHECK sobre DATETIME en la tabla' => ddlOutcome("alter table d07_probe modify state enum('a','b','c') not null, algorithm=instant, lock=default"),
        'ADD COLUMN en una tabla con un CHECK sobre DATETIME' => ddlOutcome('alter table d07_probe add column extra int null, algorithm=instant, lock=default'),
        'ADD COLUMN con su propio CHECK' => ddlOutcome('alter table d07_probe add column positive int null check (positive > 0), algorithm=instant, lock=default'),
        'ADD FOREIGN KEY sobre una tabla con filas, con las comprobaciones activas' => ddlOutcome('alter table d07_child add constraint d07_child_probe_foreign foreign key (probe_id) references d07_probe (id), algorithm=inplace, lock=none'),
    ];

    expect($measured)->toBe(D07_MEASURED ?? ['sin medir: copiá este resultado a D07_MEASURED' => $measured]);
});
