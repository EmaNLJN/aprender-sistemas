<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** @return list<object> */
function ledgerColumns(): array
{
    return DB::select(
        "select column_name as name, column_type as type, is_nullable as nullable, data_type as data_type from information_schema.columns
         where table_schema = database() and table_name = 'account_deletions' order by ordinal_position",
    );
}

it('A: account_deletions is an InnoDB table of three columns and none is a TIMESTAMP', function () {
    $engine = DB::scalar("select engine from information_schema.tables where table_schema = database() and table_name = 'account_deletions'");
    $columns = ledgerColumns();

    expect($engine)->toBe('InnoDB')
        ->and(array_map(fn (object $column) => $column->name, $columns))->toBe(['user_id', 'user_created_at', 'deleted_at'])
        ->and(array_map(fn (object $column) => $column->data_type, $columns))->not->toContain('timestamp');
});

it('B: the columns are bigint unsigned and datetime(3), all NOT NULL', function () {
    $types = [];
    foreach (ledgerColumns() as $column) {
        $types[$column->name] = [$column->type, $column->nullable];
    }

    expect($types)->toBe([
        'user_id' => ['bigint unsigned', 'NO'],
        'user_created_at' => ['datetime(3)', 'NO'],
        'deleted_at' => ['datetime(3)', 'NO'],
    ]);
});

it('C: the primary key is user_id and deleted_at has its own index', function () {
    $indexes = [];
    foreach (DB::select("select index_name as name, column_name as col, seq_in_index as seq, non_unique as non_unique from information_schema.statistics where table_schema = database() and table_name = 'account_deletions' order by index_name, seq_in_index") as $row) {
        $indexes[$row->name][] = [$row->col, (int) $row->non_unique];
    }

    ksort($indexes);

    expect($indexes)->toBe([
        'PRIMARY' => [['user_id', 0]],
        'account_deletions_deleted_at_index' => [['deleted_at', 1]],
    ]);
});

it('D: it has no foreign key, neither from it nor to it', function () {
    $constraints = DB::select(
        "select table_name as t from information_schema.key_column_usage
         where table_schema = database() and referenced_table_name is not null and (table_name = 'account_deletions' or referenced_table_name = 'account_deletions')",
    );

    expect(Schema::hasTable('account_deletions'))->toBeTrue()
        ->and($constraints)->toBe([]);
});
