<?php

use App\Admin\AccountChanges;
use App\Admin\LastAdmin;
use App\Auth\AccountStatus;
use App\Models\User;
use Tests\Support\Parallel;

function disablesTheOther(int $actorId, int $targetId): Closure
{
    return function () use ($actorId, $targetId): string {
        try {
            app(AccountChanges::class)->change(User::findOrFail($actorId), $targetId, null, AccountStatus::Disabled);

            return 'disabled';
        } catch (LastAdmin) {
            return 'last_admin';
        }
    };
}

it('lets exactly one of two admins disable the other, twenty times out of twenty', function () {
    $first = User::factory()->admin()->create();
    $second = User::factory()->admin()->create();

    foreach (range(1, 20) as $round) {
        User::query()->whereKey([$first->id, $second->id])->update(['status' => AccountStatus::Active]);

        $outcomes = collect(Parallel::run([
            disablesTheOther($first->id, $second->id),
            disablesTheOther($second->id, $first->id),
        ]))->sort()->values()->all();

        expect($outcomes)->toBe(['disabled', 'last_admin'], "round $round")
            ->and(User::query()->where('role', 'admin')->where('status', 'active')->count())->toBe(1, "round $round");
    }
});
