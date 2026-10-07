<?php

use App\Runs\Record\Instant;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\RunWorld;

const PRUNE_RAW_NOW = '2026-10-20 12:00:00.000';

beforeEach(function () {
    $this->travelTo(Instant::parse(PRUNE_RAW_NOW));
});

function pruneRawImport(int $userId, string $importedAt, ?string $raw = '{"raw":true}'): int
{
    return DB::table('progress_imports')->insertGetId([
        'user_id' => $userId,
        'import_id' => (string) Str::uuid(),
        'source' => 'storage',
        'raw_payload' => $raw,
        'raw_sha256' => hash('sha256', $raw ?? 'pruned'),
        'report' => '{"imported":true}',
        'epoch' => 1,
        'revision' => 4,
        'imported_at' => $importedAt,
    ]);
}

function pruneRawPayloads(): array
{
    return DB::table('progress_imports')->orderBy('id')->pluck('raw_payload', 'id')->all();
}

function pruneRawLoggedStatements(): array
{
    return collect(DB::getQueryLog())->pluck('query')->filter(fn (string $sql) => str_contains($sql, 'progress_imports'))->values()->all();
}

it('nulls a raw payload imported 90 days and a millisecond ago and keeps one imported 90 days minus a millisecond ago', function () {
    $user = RunWorld::user();
    $expired = pruneRawImport($user->id, '2026-07-22 11:59:59.999');
    $kept = pruneRawImport($user->id, '2026-07-22 12:00:00.001');

    $this->artisan('progress:prune-import-payloads')->assertSuccessful();

    expect(pruneRawPayloads())->toBe([$expired => null, $kept => '{"raw":true}']);
});

it('keeps a raw payload imported exactly 90 days ago', function () {
    $user = RunWorld::user();
    $id = pruneRawImport($user->id, '2026-07-22 12:00:00.000');

    $this->artisan('progress:prune-import-payloads')->assertSuccessful();

    expect(pruneRawPayloads())->toBe([$id => '{"raw":true}']);
});

it('keeps the sha256, the report and the rest of the row of a pruned import', function () {
    $user = RunWorld::user();
    $id = pruneRawImport($user->id, '2026-06-01 00:00:00.000', 'original bytes');
    $before = (array) DB::table('progress_imports')->find($id);

    $this->artisan('progress:prune-import-payloads')->assertSuccessful();

    $after = (array) DB::table('progress_imports')->find($id);
    expect($after['raw_payload'])->toBeNull()
        ->and(Arr::except($after, 'raw_payload'))->toBe(Arr::except($before, 'raw_payload'))
        ->and($after['raw_sha256'])->toBe(hash('sha256', 'original bytes'))
        ->and($after['report'])->toBe('{"imported":true}');
});

it('prunes the expired raw payloads of every account', function () {
    $first = RunWorld::user();
    $second = RunWorld::user();
    pruneRawImport($first->id, '2026-05-01 00:00:00.000');
    pruneRawImport($second->id, '2026-05-02 00:00:00.000');
    $recent = pruneRawImport($second->id, '2026-10-19 00:00:00.000');

    $this->artisan('progress:prune-import-payloads')->assertSuccessful();

    expect(array_filter(pruneRawPayloads(), fn (?string $raw) => $raw !== null))->toBe([$recent => '{"raw":true}']);
});

it('prunes in batches, reading ids by primary key with a limit and writing with where id in', function () {
    config(['progress.batches.prune' => 5]);
    $user = RunWorld::user();
    $ids = [];
    foreach (range(1, 12) as $day) {
        $ids[] = pruneRawImport($user->id, sprintf('2026-05-%02d 00:00:00.000', $day));
    }
    DB::flushQueryLog();
    DB::enableQueryLog();

    $this->artisan('progress:prune-import-payloads')->expectsOutput('Crudos de importación podados: 12.')->assertSuccessful();

    $select = 'select `id` from `progress_imports` where `imported_at` < ? and `raw_payload` is not null order by `id` asc limit 5';
    expect(pruneRawLoggedStatements())->toBe([
        $select,
        'update `progress_imports` set `raw_payload` = ? where `id` in (?, ?, ?, ?, ?)',
        $select,
        'update `progress_imports` set `raw_payload` = ? where `id` in (?, ?, ?, ?, ?)',
        $select,
        'update `progress_imports` set `raw_payload` = ? where `id` in (?, ?)',
    ])->and(array_filter(pruneRawPayloads(), fn (?string $raw) => $raw !== null))->toBe([]);
});

it('stops after the maximum number of batches per run', function () {
    config(['progress.batches.prune' => 5, 'progress.batches.prune_max' => 1]);
    $user = RunWorld::user();
    foreach (range(1, 12) as $day) {
        pruneRawImport($user->id, sprintf('2026-05-%02d 00:00:00.000', $day));
    }

    $this->artisan('progress:prune-import-payloads')->expectsOutput('Crudos de importación podados: 5.')->assertSuccessful();

    expect(DB::table('progress_imports')->whereNotNull('raw_payload')->count())->toBe(7);
});

it('does not write again what is already pruned', function () {
    $user = RunWorld::user();
    pruneRawImport($user->id, '2026-05-01 00:00:00.000', null);
    DB::flushQueryLog();
    DB::enableQueryLog();

    $this->artisan('progress:prune-import-payloads')->expectsOutput('Crudos de importación podados: 0.')->assertSuccessful();

    expect(collect(DB::getQueryLog())->pluck('query')->filter(fn (string $sql) => str_starts_with($sql, 'update')))->toBeEmpty();
});

it('reports how many raw payloads it pruned and a second run prunes none', function () {
    $user = RunWorld::user();
    pruneRawImport($user->id, '2026-05-01 00:00:00.000');
    pruneRawImport($user->id, '2026-05-02 00:00:00.000');
    pruneRawImport($user->id, '2026-10-19 00:00:00.000');

    $this->artisan('progress:prune-import-payloads')->expectsOutput('Crudos de importación podados: 2.')->assertExitCode(0);
    $this->artisan('progress:prune-import-payloads')->expectsOutput('Crudos de importación podados: 0.')->assertExitCode(0);
});

it('changes no other table', function () {
    $user = RunWorld::user();
    DB::table('progress_heads')->insert(['user_id' => $user->id, 'epoch' => 3, 'revision' => 9, 'created_at' => '2026-05-01 00:00:00.000', 'updated_at' => '2026-05-01 00:00:00.000']);
    DB::table('route_notes')->insert([
        'user_id' => $user->id, 'language' => 'rust', 'field' => 'learned', 'body' => 'ownership', 'revision' => 9,
        'created_at' => '2026-05-01 00:00:00.000', 'updated_at' => '2026-05-01 00:00:00.000',
    ]);
    pruneRawImport($user->id, '2026-05-01 00:00:00.000');
    $tables = ['progress_heads', 'route_notes', 'sync_operations', 'attempts', 'attempt_payloads', 'users'];
    $before = collect($tables)->mapWithKeys(fn (string $table) => [$table => DB::table($table)->get()->toJson()]);

    $this->artisan('progress:prune-import-payloads')->assertSuccessful();

    $after = collect($tables)->mapWithKeys(fn (string $table) => [$table => DB::table($table)->get()->toJson()]);
    expect($after->all())->toBe($before->all());
});

it('still finds the import by its sha256 after pruning (US7.3)', function () {
    $user = RunWorld::user();
    $id = pruneRawImport($user->id, '2026-05-01 00:00:00.000', 'same bytes');

    $this->artisan('progress:prune-import-payloads')->assertSuccessful();

    $found = DB::table('progress_imports')->where('user_id', $user->id)->where('raw_sha256', hash('sha256', 'same bytes'))->where('epoch', 1)->value('id');
    expect($found)->toBe($id);
});
