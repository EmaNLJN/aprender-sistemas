<?php

use App\Jobs\PurgeUserData;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Queue\Attributes\Backoff;
use Illuminate\Queue\Attributes\Timeout;
use Illuminate\Queue\Attributes\Tries;
use Illuminate\Queue\Attributes\UniqueFor;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;

it('pushes a single job when the same account is requested twice', function () {
    Queue::fake();

    PurgeUserData::dispatch(5);
    PurgeUserData::dispatch(5);

    Queue::assertPushed(PurgeUserData::class, 1);
});

it('pushes one job per account', function () {
    Queue::fake();

    PurgeUserData::dispatch(5);
    PurgeUserData::dispatch(6);

    Queue::assertPushed(PurgeUserData::class, 2);
});

it('declares the retry, timeout, backoff and uniqueness of the contract', function () {
    $class = new ReflectionClass(PurgeUserData::class);

    $tries = $class->getAttributes(Tries::class)[0]->newInstance();
    $timeout = $class->getAttributes(Timeout::class)[0]->newInstance();
    $uniqueFor = $class->getAttributes(UniqueFor::class)[0]->newInstance();
    $backoff = $class->getAttributes(Backoff::class)[0]->newInstance();

    expect($tries->tries)->toBe(8)
        ->and($timeout->timeout)->toBe(300)
        ->and($uniqueFor->uniqueFor)->toBe(18000)
        ->and($backoff->backoff)->toBe([60, 300, 900, 1800, 3600])
        ->and((new PurgeUserData(5))->uniqueId())->toBe('5')
        ->and(new PurgeUserData(5))->not->toBeInstanceOf(ShouldBeEncrypted::class);
});

it('stores only the account id in the payload of the database queue', function () {
    config(['queue.default' => 'database']);
    $user = User::factory()->create(['email' => 'secreta@example.test']);

    PurgeUserData::dispatch($user->id);

    $payload = (string) DB::table('jobs')->latest('id')->value('payload');
    expect($payload)->toContain((string) $user->id)
        ->and($payload)->not->toContain('secreta@example.test');
});
