<?php

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

// ADR 0006 D07 on the mysql:9.7 pinned in compose.yaml: a CHECK on a DATETIME column can keep an ENUM widening or
// an ADD COLUMN from being INSTANT (MySQL bugs #117450, #121124). INSTANT only accepts LOCK=DEFAULT: any other LOCK
// gets error 1221 before MySQL looks at the operation, which measures nothing. D07_MEASURED holds what MySQL answered,
// "ok" or its error code (1845, 1846: not possible without copying the table); if a new image changes it, review D07 first.
const D07_MEASURED = [
    'widen an ENUM at the end, with a CHECK on a DATETIME in the table' => '1845',
    'ADD COLUMN on a table with a CHECK on a DATETIME' => 'ok',
    'ADD COLUMN with its own CHECK' => '1845',
    'ADD FOREIGN KEY on a table with rows, with checks enabled' => '1846',
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

it('measures the four D07 cases on mysql:9.7', function () {
    $measured = [
        'widen an ENUM at the end, with a CHECK on a DATETIME in the table' => ddlOutcome("alter table d07_probe modify state enum('a','b','c') not null, algorithm=instant, lock=default"),
        'ADD COLUMN on a table with a CHECK on a DATETIME' => ddlOutcome('alter table d07_probe add column extra int null, algorithm=instant, lock=default'),
        'ADD COLUMN with its own CHECK' => ddlOutcome('alter table d07_probe add column positive int null check (positive > 0), algorithm=instant, lock=default'),
        'ADD FOREIGN KEY on a table with rows, with checks enabled' => ddlOutcome('alter table d07_child add constraint d07_child_probe_foreign foreign key (probe_id) references d07_probe (id), algorithm=inplace, lock=none'),
    ];

    expect($measured)->toBe(D07_MEASURED ?? ['unmeasured: copy this result into D07_MEASURED' => $measured]);
});
