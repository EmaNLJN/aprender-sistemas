<?php

use App\Models\DeletedAccount;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

function ledgerRow(int $userId, string $deletedAt): array
{
    return ['user_id' => $userId, 'user_created_at' => '2026-01-01 00:00:00.000', 'deleted_at' => $deletedAt];
}

it('prunes a ledger row of 36 days and keeps one of 34', function () {
    $this->travelTo('2026-10-05 12:00:00');
    DB::table('account_deletions')->insert([
        ledgerRow(1, now()->subDays(36)->format('Y-m-d H:i:s.v')),
        ledgerRow(2, now()->subDays(34)->format('Y-m-d H:i:s.v')),
    ]);

    Artisan::call('model:prune', ['--model' => DeletedAccount::class]);

    expect(DB::table('account_deletions')->pluck('user_id')->all())->toBe([2]);
});

it('keeps one row per id when it is inserted twice and the first keeps its values', function () {
    DB::table('account_deletions')->insertOrIgnore(ledgerRow(7, '2026-10-01 10:00:00.000'));
    DB::table('account_deletions')->insertOrIgnore(ledgerRow(7, '2026-10-02 11:00:00.000'));

    $rows = DB::table('account_deletions')->get();

    expect($rows)->toHaveCount(1)
        ->and($rows[0]->deleted_at)->toBe('2026-10-01 10:00:00.000');
});

it('stores and returns user_created_at with milliseconds', function () {
    DeletedAccount::unguarded(fn () => DeletedAccount::create([
        'user_id' => 9, 'user_created_at' => '2026-10-05 12:00:00.123', 'deleted_at' => '2026-10-06 08:00:00.456',
    ]));

    $account = DeletedAccount::findOrFail(9);

    expect($account->user_created_at->format('Y-m-d H:i:s.v'))->toBe('2026-10-05 12:00:00.123')
        ->and($account->deleted_at->format('Y-m-d H:i:s.v'))->toBe('2026-10-06 08:00:00.456');
});
