<?php

use App\Admin\AccountChanges;
use App\Admin\LastAdmin;
use App\Admin\RestrictsItself;
use App\Auth\AccountStatus;
use App\Auth\Role;
use App\Models\User;
use Illuminate\Support\Facades\Event;

function adminActiveCount(): int
{
    return User::query()->where('role', 'admin')->where('status', 'active')->count();
}

function adminRemovalAttempt(string $way, User $actor, User $target): void
{
    $changes = app(AccountChanges::class);
    match ($way) {
        'disable' => $changes->change($actor, $target->id, null, AccountStatus::Disabled),
        'demote' => $changes->change($actor, $target->id, Role::Student, null),
        'delete' => $changes->beginDeletion($target->id),
    };
}

beforeEach(function () {
    Event::fake();
});

it('never leaves the workshop without an active admin', function (string $way, bool $targetIsSelf, int $activeAdminsAtStart, ?string $refusal, int $activeAdminsAtEnd) {
    $actor = User::factory()->admin()->create();
    $others = User::factory()->admin()->count($activeAdminsAtStart - 1)->create();
    $target = $targetIsSelf ? $actor : $others->first() ?? User::factory()->admin()->disabled()->create();

    if ($refusal === null) {
        adminRemovalAttempt($way, $actor, $target);
    } else {
        expect(fn () => adminRemovalAttempt($way, $actor, $target))->toThrow($refusal);
    }

    expect(adminActiveCount())->toBe($activeAdminsAtEnd)->toBeGreaterThanOrEqual(1);
})->with([
    'disable another with two admins' => ['disable', false, 2, null, 1],
    'demote another with two admins' => ['demote', false, 2, null, 1],
    'delete another with two admins' => ['delete', false, 2, null, 1],
    'disable oneself with two admins' => ['disable', true, 2, RestrictsItself::class, 2],
    'demote oneself with two admins' => ['demote', true, 2, RestrictsItself::class, 2],
    'delete oneself with two admins' => ['delete', true, 2, null, 1],
    'disable oneself alone' => ['disable', true, 1, RestrictsItself::class, 1],
    'demote oneself alone' => ['demote', true, 1, RestrictsItself::class, 1],
    'delete oneself alone' => ['delete', true, 1, LastAdmin::class, 1],
]);

it('refuses each way to remove the only active admin when someone else asks', function (string $way) {
    $onlyActiveAdmin = User::factory()->admin()->create();
    $disabledAdmin = User::factory()->admin()->disabled()->create();

    expect(fn () => adminRemovalAttempt($way, $disabledAdmin, $onlyActiveAdmin))->toThrow(LastAdmin::class);

    expect(adminActiveCount())->toBe(1);
})->with(['disable', 'demote', 'delete']);
