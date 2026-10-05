<?php

use Illuminate\Support\Facades\DB;
use Tests\Support\ContentDatabase;

it('counts returns the 21 tables, empty, in migration order', function () {
    $counts = ContentDatabase::counts();

    expect(array_keys($counts))->toBe(ContentDatabase::TABLES)
        ->and(count($counts))->toBe(21)
        ->and(array_sum($counts))->toBe(0);
});

it('checksums changes only for the table that changed', function () {
    $before = ContentDatabase::checksums();
    DB::table('languages')->insert(['code' => 'rust', 'position' => 1]);
    $after = ContentDatabase::checksums();

    expect(array_keys($before))->toBe(ContentDatabase::TABLES)
        ->and(array_keys(array_diff_assoc($after, $before)))->toBe(['languages']);
});

it('contentWritesDuring sees every write to a content table, TRUNCATE included, and nothing else', function () {
    $writes = ContentDatabase::contentWritesDuring(function () {
        DB::table('languages')->insert(['code' => 'go', 'position' => 2]);
        DB::table('languages')->upsert([['code' => 'go', 'position' => 3]], ['code'], ['position']);
        DB::table('languages')->where('code', 'go')->update(['position' => 4]);
        DB::table('exercise_hints')->truncate();
        DB::table('languages')->where('code', 'zz')->delete();
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
