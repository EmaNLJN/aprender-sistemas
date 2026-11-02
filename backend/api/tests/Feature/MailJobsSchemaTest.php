<?php

use Illuminate\Support\Facades\DB;

it('A: mail_jobs is an InnoDB table of seven columns with the types and nullability of the queue', function () {
    $engine = DB::scalar("select engine from information_schema.tables where table_schema = database() and table_name = 'mail_jobs'");
    $columns = [];
    foreach (DB::select(
        "select column_name as name, column_type as type, is_nullable as nullable, extra as extra from information_schema.columns
         where table_schema = database() and table_name = 'mail_jobs' order by ordinal_position",
    ) as $column) {
        $columns[$column->name] = [$column->type, $column->nullable, str_contains($column->extra, 'auto_increment')];
    }

    expect($engine)->toBe('InnoDB')
        ->and($columns)->toBe([
            'id' => ['bigint unsigned', 'NO', true],
            'queue' => ['varchar(255)', 'NO', false],
            'payload' => ['longtext', 'NO', false],
            'attempts' => ['smallint unsigned', 'NO', false],
            'reserved_at' => ['int unsigned', 'YES', false],
            'available_at' => ['int unsigned', 'NO', false],
            'created_at' => ['int unsigned', 'NO', false],
        ]);
});

it('B: the primary key is id and the only other index is on queue', function () {
    $indexes = [];
    foreach (DB::select("select index_name as name, column_name as col, non_unique as non_unique from information_schema.statistics where table_schema = database() and table_name = 'mail_jobs' order by index_name, seq_in_index") as $row) {
        $indexes[$row->name][] = [$row->col, (int) $row->non_unique];
    }

    ksort($indexes);

    expect($indexes)->toBe([
        'PRIMARY' => [['id', 0]],
        'mail_jobs_queue_index' => [['queue', 1]],
    ]);
});

it('C: it has no foreign key, neither from it nor to it', function () {
    $constraints = DB::select(
        "select table_name as t from information_schema.key_column_usage
         where table_schema = database() and referenced_table_name is not null and (table_name = 'mail_jobs' or referenced_table_name = 'mail_jobs')",
    );

    expect($constraints)->toBe([]);
});
