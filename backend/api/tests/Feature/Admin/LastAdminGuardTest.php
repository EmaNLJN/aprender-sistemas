<?php

use App\Admin\LastAdminGuard;
use App\Database\WriteTransaction;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

function adminLockInTransaction(int $targetId): object
{
    return WriteTransaction::run(fn () => (new LastAdminGuard)->lock($targetId));
}

it('counts no other active admin when the target is the only one', function () {
    $admin = User::factory()->admin()->create();

    $locked = adminLockInTransaction($admin->id);

    expect($locked->user->is($admin))->toBeTrue()
        ->and($locked->otherActiveAdmins)->toBe(0);
});

it('counts the other active admin', function () {
    $admin = User::factory()->admin()->create();
    User::factory()->admin()->create();

    expect(adminLockInTransaction($admin->id)->otherActiveAdmins)->toBe(1);
});

it('does not count a disabled admin', function () {
    $admin = User::factory()->admin()->create();
    User::factory()->admin()->create();
    User::factory()->admin()->disabled()->create();

    expect(adminLockInTransaction($admin->id)->otherActiveAdmins)->toBe(1);
});

it('does not count an active student', function () {
    $admin = User::factory()->admin()->create();
    User::factory()->create();

    expect(adminLockInTransaction($admin->id)->otherActiveAdmins)->toBe(0);
});

it('counts every active admin when the target is a student', function () {
    $student = User::factory()->create();
    User::factory()->admin()->count(2)->create();

    expect(adminLockInTransaction($student->id)->otherActiveAdmins)->toBe(2);
});

it('throws ModelNotFoundException for a target that does not exist', function () {
    User::factory()->admin()->create();

    adminLockInTransaction(999999);
})->throws(ModelNotFoundException::class);

it('locks the active admins first and the target second, both with for update', function () {
    $admin = User::factory()->admin()->create();
    $student = User::factory()->create();

    DB::enableQueryLog();
    adminLockInTransaction($student->id);
    $statements = collect(DB::getQueryLog())
        ->pluck('query')
        ->filter(fn (string $sql) => str_contains($sql, 'from `users`'))
        ->values();

    expect($statements)->toHaveCount(2)
        ->and($statements[0])->toContain('`role` = ?')->toContain('`status` = ?')->toEndWith('for update')
        ->and($statements[1])->toContain('`id` = ?')->toEndWith('for update');
    expect(collect(DB::getQueryLog())->firstWhere(fn (array $entry) => str_contains($entry['query'], '`role` = ?'))['bindings'])
        ->toBe(['admin', 'active']);
});
