<?php

use App\Accounts\AccountDeletion;
use App\Admin\LastAdmin;
use App\Auth\AccountStatus;
use App\Jobs\PurgeUserData;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\Queue;

it('pushes a single purge when the same account is requested twice', function () {
    Queue::fake();
    $student = User::factory()->create();

    app(AccountDeletion::class)->request($student->id);
    app(AccountDeletion::class)->request($student->id);

    Queue::assertPushed(PurgeUserData::class, 1);
    expect($student->fresh()->status)->toBe(AccountStatus::Deleting);
});

it('returns the account in deleting', function () {
    Queue::fake();
    $student = User::factory()->create();

    expect(app(AccountDeletion::class)->request($student->id)->status)->toBe(AccountStatus::Deleting);
});

it('pushes nothing when the guard refuses', function () {
    Queue::fake();
    $admin = User::factory()->admin()->create();

    expect(fn () => app(AccountDeletion::class)->request($admin->id))->toThrow(LastAdmin::class);
    Queue::assertNothingPushed();
});

it('throws when the account does not exist', function () {
    Queue::fake();

    expect(fn () => app(AccountDeletion::class)->request(999999))->toThrow(ModelNotFoundException::class);
    Queue::assertNothingPushed();
});
