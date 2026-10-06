<?php

use App\Jobs\PurgeUserData;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    Carbon::setTestNow('2026-10-06 12:00:00');
    Queue::fake();
});

afterEach(fn () => Carbon::setTestNow());

function resumePurgesAccount(string $status, string $updatedAt): User
{
    $user = User::factory()->create(['status' => $status]);
    DB::table('users')->where('id', $user->id)->update(['updated_at' => $updatedAt]);

    return $user;
}

it('requests the purge only of the accounts deleting for more than 15 minutes', function () {
    $stuck = resumePurgesAccount('deleting', '2026-10-06 11:44:59.000');
    $recent = resumePurgesAccount('deleting', '2026-10-06 11:45:01.000');
    resumePurgesAccount('active', '2026-10-06 10:00:00.000');
    resumePurgesAccount('disabled', '2026-10-06 10:00:00.000');
    Log::spy();

    $exit = Artisan::call('taller:resume-purges');

    expect($exit)->toBe(0)
        ->and(Artisan::output())->toContain('1 purga retomada');
    Queue::assertPushed(PurgeUserData::class, 1);
    Queue::assertPushed(PurgeUserData::class, fn (PurgeUserData $job) => $job->userId === $stuck->id);
    Queue::assertNotPushed(PurgeUserData::class, fn (PurgeUserData $job) => $job->userId === $recent->id);
    Log::shouldHaveReceived('info')->with('purge.resumed', ['user_id' => $stuck->id])->once();
});

it('does not log an email', function () {
    $stuck = resumePurgesAccount('deleting', '2026-10-06 10:00:00.000');
    Log::spy();

    Artisan::call('taller:resume-purges');

    Log::shouldHaveReceived('info')->withArgs(fn (string $message, array $context) => $message === 'purge.resumed'
        && ! str_contains(json_encode($context, JSON_THROW_ON_ERROR), $stuck->email))->once();
});

it('does not push a second job while the first one of the account holds its uniqueness', function () {
    $stuck = resumePurgesAccount('deleting', '2026-10-06 10:00:00.000');
    PurgeUserData::dispatch($stuck->id);

    Artisan::call('taller:resume-purges');

    Queue::assertPushed(PurgeUserData::class, 1);
});

it('says 0 purgas retomadas and exits 0 when nothing is stuck', function () {
    expect(Artisan::call('taller:resume-purges'))->toBe(0)
        ->and(Artisan::output())->toContain('0 purgas retomadas');
    Queue::assertNothingPushed();
});
