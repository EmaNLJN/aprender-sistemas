<?php

use Illuminate\Support\Facades\DB;
use Tests\Support\ProgressWorld;

function upsertFocusMinutes(int $userId, int $minutes): int
{
    return DB::affectingStatement(
        'INSERT INTO `preferences` (`user_id`, `focus_minutes`, `revision`, `created_at`, `updated_at`) VALUES (?, ?, 1, ?, ?) AS `n` '
        .'ON DUPLICATE KEY UPDATE `focus_minutes` = `n`.`focus_minutes`',
        [$userId, $minutes, '2026-10-06 12:00:00.000', '2026-10-06 12:00:00.000'],
    );
}

it('reports 1 affected row when the upsert inserts', function () {
    $user = ProgressWorld::user();

    expect(upsertFocusMinutes($user->id, 25))->toBe(1);
});

it('reports 2 affected rows when the upsert changes an existing row', function () {
    $user = ProgressWorld::user();
    upsertFocusMinutes($user->id, 25);

    expect(upsertFocusMinutes($user->id, 45))->toBe(2);
});

it('reports 0 affected rows when the upsert leaves the row as it was', function () {
    $user = ProgressWorld::user();
    upsertFocusMinutes($user->id, 25);

    expect(upsertFocusMinutes($user->id, 25))->toBe(0);
});

it('reports 0 affected rows when every guarded assignment keeps the stored value', function () {
    $user = ProgressWorld::user();
    upsertFocusMinutes($user->id, 25);

    $affected = DB::affectingStatement(
        'INSERT INTO `preferences` (`user_id`, `focus_minutes`, `revision`, `created_at`, `updated_at`) VALUES (?, ?, 2, ?, ?) AS `n` '
        .'ON DUPLICATE KEY UPDATE `revision` = IF(`n`.`focus_minutes` <> `preferences`.`focus_minutes`, `n`.`revision`, `preferences`.`revision`), '
        .'`focus_minutes` = IF(`n`.`focus_minutes` > `preferences`.`focus_minutes`, `n`.`focus_minutes`, `preferences`.`focus_minutes`)',
        [$user->id, 25, '2026-10-06 12:00:01.000', '2026-10-06 12:00:01.000'],
    );

    expect($affected)->toBe(0)
        ->and((int) DB::table('preferences')->where('user_id', $user->id)->value('revision'))->toBe(1);
});
