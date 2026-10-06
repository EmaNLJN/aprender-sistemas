<?php

use App\Progress\AccountGone;
use App\Progress\AccountLock;
use App\Progress\ProgressHead;
use App\Runs\Record\Instant;
use Illuminate\Support\Facades\DB;
use Tests\Support\RunWorld;

function storedHead(int $userId): ProgressHead
{
    return ProgressHead::fromRow((array) DB::selectOne('select * from progress_heads where user_id = ?', [$userId]));
}

it('creates the head on first use with epoch 1, revision 0 and no reset or activity', function () {
    $user = RunWorld::user();

    $head = (new AccountLock)->within($user->id, fn (ProgressHead $head) => $head);

    expect($head->userId)->toBe($user->id)
        ->and($head->epoch)->toBe(1)
        ->and($head->revision)->toBe(0)
        ->and($head->resetAt)->toBeNull()
        ->and($head->lastActivityAt)->toBeNull()
        ->and(DB::table('progress_heads')->where('user_id', $user->id)->count())->toBe(1);
});

it('does not change an existing head the second time', function () {
    $user = RunWorld::user();
    $lock = new AccountLock;
    $lock->within($user->id, fn () => null);
    DB::update('update progress_heads set epoch = 3, revision = 8, created_at = ? where user_id = ?', ['2026-01-01 00:00:00.000', $user->id]);

    $head = $lock->within($user->id, fn (ProgressHead $head) => $head);

    expect($head->epoch)->toBe(3)
        ->and($head->revision)->toBe(8)
        ->and(DB::table('progress_heads')->where('user_id', $user->id)->value('created_at'))->toBe('2026-01-01 00:00:00.000');
});

it('returns what the work returns', function () {
    $user = RunWorld::user();

    expect((new AccountLock)->within($user->id, fn () => 'done'))->toBe('done');
});

it('propagates an exception of the work and rolls the head back', function () {
    $user = RunWorld::user();

    expect(fn () => (new AccountLock)->within($user->id, fn () => throw new DomainException('boom')))->toThrow(DomainException::class, 'boom')
        ->and(DB::table('progress_heads')->where('user_id', $user->id)->exists())->toBeFalse();
});

it('throws AccountGone for an account that no longer exists, leaving no head and no open transaction', function () {
    $levelBefore = DB::transactionLevel();

    try {
        (new AccountLock)->within(987654, fn () => 'unreachable');
        $this->fail('expected AccountGone');
    } catch (AccountGone $gone) {
        expect($gone->userId)->toBe(987654)
            ->and($gone->getMessage())->not->toContain('insert')->not->toContain('SQL')->not->toContain('987654 ');
    }

    expect(DB::table('progress_heads')->count())->toBe(0)
        ->and(DB::transactionLevel())->toBe($levelBefore);
});

it('runs the work inside a transaction that is already open without error 1568', function () {
    $user = RunWorld::user();
    expect(DB::transactionLevel())->toBeGreaterThan(0);

    $result = (new AccountLock)->within($user->id, fn (ProgressHead $head) => $head->epoch);

    expect($result)->toBe(1);
});

it('advances the revision by one and stamps the activity', function () {
    $user = RunWorld::user();
    $lock = new AccountLock;
    $at = Instant::parse('2026-10-05 12:00:00.123');

    $advanced = $lock->within($user->id, fn (ProgressHead $head) => $lock->advance($head, $at));
    $stored = storedHead($user->id);

    expect($advanced->revision)->toBe(1)
        ->and($stored->revision)->toBe(1)
        ->and(Instant::format($advanced->lastActivityAt))->toBe('2026-10-05 12:00:00.123')
        ->and(Instant::format($stored->lastActivityAt))->toBe('2026-10-05 12:00:00.123')
        ->and(DB::table('progress_heads')->where('user_id', $user->id)->value('updated_at'))->toBe('2026-10-05 12:00:00.123')
        ->and($advanced->epoch)->toBe($stored->epoch)
        ->and($advanced->userId)->toBe($stored->userId);
});

it('advances from the revision that the head already had', function () {
    $user = RunWorld::user();
    $lock = new AccountLock;
    $lock->within($user->id, fn () => null);
    DB::update('update progress_heads set revision = 41 where user_id = ?', [$user->id]);

    $advanced = $lock->within($user->id, fn (ProgressHead $head) => $lock->advance($head, Instant::now()));

    expect($advanced->revision)->toBe(42)
        ->and(storedHead($user->id)->revision)->toBe(42);
});
