<?php

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

function mysqlErrorCode(QueryException $error): int
{
    return (int) $error->errorInfo[1];
}

function contentImportRow(?string $sourceCommit): array
{
    return [
        'document_hash' => str_repeat('a', 64), 'source_commit' => $sourceCommit,
        'portion_hashes' => '{}', 'counts' => '{}', 'changes' => '{}', 'created_at' => '2026-10-05 00:00:00.000',
    ];
}

$now = '2026-10-05 00:00:00.000';

it('CHECK constraints reject a row that breaks their rule (error 3819)', function (string $table, array $row) {
    try {
        DB::table($table)->insert($row);
        $this->fail('expected the CHECK to reject the row');
    } catch (QueryException $error) {
        expect(mysqlErrorCode($error))->toBe(3819);
    }
})->with(function () use ($now) {
    $lifecycle = ['created_at' => $now, 'updated_at' => $now];

    return [
        'active with a retirement date' => ['catalogs', ['code' => 'a', 'slice_by' => 'language', 'status' => 'active', 'retired_at' => $now] + $lifecycle],
        'retired without a retirement date' => ['catalogs', ['code' => 'a', 'slice_by' => 'language', 'status' => 'deprecated'] + $lifecycle],
        'chain position of zero' => ['catalogs', ['code' => 'a', 'slice_by' => 'language', 'chain_position' => 0] + $lifecycle],
        'a retired catalog in the chain' => ['catalogs', ['code' => 'a', 'slice_by' => 'language', 'status' => 'deprecated', 'retired_at' => $now, 'chain_position' => 1] + $lifecycle],
        'uppercase document hash' => ['content_imports', ['document_hash' => str_repeat('A', 64), 'portion_hashes' => '{}', 'counts' => '{}', 'changes' => '{}', 'created_at' => $now]],
        '41-character commit' => ['content_imports', ['document_hash' => str_repeat('a', 64), 'source_commit' => str_repeat('a', 41), 'portion_hashes' => '{}', 'counts' => '{}', 'changes' => '{}', 'created_at' => $now]],
        'featured flag of 2' => ['guide_resources', [
            'id' => 'r', 'position' => 0, 'title' => 't', 'url' => 'u', 'languages_json' => '["rust"]', 'category' => 'lectura', 'cost' => 'gratis',
            'format' => 'f', 'description' => 'd', 'why' => 'w', 'caveat' => 'c', 'featured' => 2, 'key_order' => '[]',
        ] + $lifecycle],
        'guide source whose key_order is not JSON' => ['guide_sources', ['position' => 0, 'title' => 't', 'url' => 'u', 'note' => 'n', 'key_order' => 'not json'] + $lifecycle],
    ];
});

// ICU lets `$` match before a final line break, so a pattern ending in `$` needs the exact length around it.
it('content_imports_source_commit_check rejects what is not exactly 40 or 64 lowercase hexadecimals', function (string $commit) {
    try {
        DB::table('content_imports')->insert(contentImportRow($commit));
        $this->fail('expected content_imports_source_commit_check to reject the commit');
    } catch (QueryException $error) {
        expect(mysqlErrorCode($error))->toBe(3819)
            ->and($error->errorInfo[2])->toContain('content_imports_source_commit_check');
    }
})->with([
    '39 hexadecimals and a line break' => [str_repeat('a', 39)."\n"],
    '63 hexadecimals and a line break' => [str_repeat('a', 63)."\n"],
    '40 hexadecimals and a line break' => [str_repeat('a', 40)."\n"],
    'uppercase hexadecimals' => [str_repeat('A', 40)],
    '40 characters that are not hexadecimals' => [str_repeat('g', 40)],
]);

it('content_imports_source_commit_check accepts no commit, and 40 or 64 lowercase hexadecimals', function (?string $commit) {
    DB::table('content_imports')->insert(contentImportRow($commit));

    expect(DB::table('content_imports')->value('source_commit'))->toBe($commit);
})->with([
    'no commit' => [null],
    '40 hexadecimals' => [str_repeat('a', 40)],
    '64 hexadecimals' => [str_repeat('0123456789abcdef', 4)],
]);

it('foreign keys do not allow deleting what another row references (RESTRICT)', function () {
    $now = '2026-10-05 00:00:00.000';
    DB::table('languages')->insert(['code' => 'rust', 'position' => 1]);
    DB::table('topics')->insert(['language' => 'rust', 'topic_key' => 'basics', 'label' => 'Básicos', 'created_at' => $now, 'updated_at' => $now]);

    try {
        DB::table('languages')->where('code', 'rust')->delete();
        $this->fail('expected RESTRICT to block the delete');
    } catch (QueryException $error) {
        expect(mysqlErrorCode($error))->toBe(1451);
    }
    try {
        DB::table('languages')->where('code', 'rust')->update(['code' => 'rs']);
        $this->fail('expected RESTRICT to block the key change');
    } catch (QueryException $error) {
        expect(mysqlErrorCode($error))->toBe(1451);
    }
});

it('IDs compare byte by byte: "Lab" and "lab" are different catalogs', function () {
    $now = '2026-10-05 00:00:00.000';
    foreach (['lab', 'Lab'] as $code) {
        DB::table('catalogs')->insert(['code' => $code, 'slice_by' => 'language', 'created_at' => $now, 'updated_at' => $now]);
    }

    expect(DB::table('catalogs')->count())->toBe(2);
});
