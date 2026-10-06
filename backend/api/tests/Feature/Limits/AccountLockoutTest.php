<?php

use App\Auth\AccountLockout;
use App\Auth\Email;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Sleep;
use Tests\Feature\Limits\DatabaseDrivers;

beforeEach(function () {
    DatabaseDrivers::useWithFixedClock();
    $this->lockout = app(AccountLockout::class);
    $this->failTimes = function (string $email, int $times) {
        foreach (range(1, $times) as $ignored) {
            $state = $this->lockout->recordFailure($email);
        }

        return $state;
    };
});

afterEach(function () {
    Carbon::setTestNow();
    Sleep::fake(false);
});

it('locks progressively from the tenth consecutive failure', function (int $fails, int $seconds) {
    $state = ($this->failTimes)('ana@x.com', $fails);

    expect($state->fails)->toBe($fails)
        ->and($state->retryAfter(now()->getTimestamp()))->toBe($seconds)
        ->and($this->lockout->state('ana@x.com')->retryAfter(now()->getTimestamp()))->toBe($seconds)
        ->and($state->isPermanent())->toBeFalse();
})->with([
    'nine failures do not lock' => [9, 0],
    'ten lock for a minute' => [10, 60],
    'eleven lock for two' => [11, 120],
    'twelve lock for four' => [12, 240],
    'thirteen lock for eight' => [13, 480],
    'fourteen lock for fifteen' => [14, 900],
    'twenty stay at fifteen' => [20, 900],
    'ninety nine stay at fifteen' => [99, 900],
]);

it('becomes permanent at one hundred failures', function () {
    $state = ($this->failTimes)('ana@x.com', 100);

    expect($state->isPermanent())->toBeTrue()
        ->and($this->lockout->state('ana@x.com')->isPermanent())->toBeTrue()
        ->and($state->retryAfter(now()->getTimestamp()))->toBeGreaterThan(900);
});

it('stops being locked when the lock window has passed even though failures remain', function () {
    ($this->failTimes)('ana@x.com', 10);

    $this->travel(61)->seconds();

    $state = $this->lockout->state('ana@x.com');
    expect($state->fails)->toBe(10)
        ->and($state->retryAfter(now()->getTimestamp()))->toBe(0);
});

it('forgets the failures 24 hours after the last one', function () {
    ($this->failTimes)('ana@x.com', 3);

    $this->travel(24 * 3600 - 1)->seconds();
    expect($this->lockout->state('ana@x.com')->fails)->toBe(3);

    $this->travel(2)->seconds();
    expect($this->lockout->state('ana@x.com')->fails)->toBe(0);
});

it('restarts the 24 hours with every new failure', function () {
    $this->lockout->recordFailure('ana@x.com');
    $this->travel(23)->hours();
    $this->lockout->recordFailure('ana@x.com');
    $this->travel(23)->hours();

    expect($this->lockout->state('ana@x.com')->fails)->toBe(2);
});

it('keeps a permanent lock for 30 days', function () {
    ($this->failTimes)('ana@x.com', 100);

    $this->travel(29)->days();
    expect($this->lockout->state('ana@x.com')->isPermanent())->toBeTrue();

    $this->travel(2)->days();
    expect($this->lockout->state('ana@x.com')->fails)->toBe(0);
});

it('goes back to zero on clear', function () {
    ($this->failTimes)('ana@x.com', 12);

    $this->lockout->clear('ana@x.com');

    $state = $this->lockout->state('ana@x.com');
    expect($state->fails)->toBe(0)
        ->and($state->retryAfter(now()->getTimestamp()))->toBe(0);
});

it('shares the state between spellings of the same canonical email', function () {
    $this->lockout->recordFailure(Email::canonical('ANA@x.com'));
    $this->lockout->recordFailure(Email::canonical(' ana@x.com '));

    expect($this->lockout->state(Email::canonical('Ana@X.com'))->fails)->toBe(2);
});

it('keeps the state per email whether or not the account exists', function () {
    ($this->failTimes)('ghost@x.com', 10);

    expect($this->lockout->state('ghost@x.com')->retryAfter(now()->getTimestamp()))->toBe(60)
        ->and($this->lockout->state('other@x.com')->fails)->toBe(0);
});

it('stores the state under the sha256 of the email as a plain array', function () {
    $this->lockout->recordFailure('ana@x.com');

    expect(Cache::get('login:account:'.hash('sha256', 'ana@x.com')))
        ->toBe(['fails' => 1, 'lockedUntil' => 0]);
});

it('counts two consecutive failures as two', function () {
    $this->lockout->recordFailure('ana@x.com');

    expect($this->lockout->recordFailure('ana@x.com')->fails)->toBe(2);
});

it('fails instead of writing a stale counter while another request holds the lock', function () {
    Sleep::fake(syncWithCarbon: true);
    $lock = Cache::lock('login:account-lock:'.hash('sha256', 'ana@x.com'), 5);
    $lock->get();

    try {
        $this->lockout->recordFailure('ana@x.com');
    } catch (LockTimeoutException) {
    }
    $lock->release();

    expect($this->lockout->state('ana@x.com')->fails)->toBe(0)
        ->and($this->lockout->recordFailure('ana@x.com')->fails)->toBe(1);
});
