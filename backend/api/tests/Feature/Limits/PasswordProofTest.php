<?php

use App\Auth\AccountLockout;
use App\Auth\DeviceCookie;
use App\Auth\DeviceToken;
use App\Auth\PasswordProof;
use App\Auth\PlainPassword;
use App\Auth\ProofOutcome;
use App\Models\User;
use Illuminate\Http\Request;
use Tests\Feature\Limits\DatabaseDrivers;

beforeEach(function () {
    useSampleBlockedPasswords();
    DatabaseDrivers::useWithFixedClock();
    $this->proof = app(PasswordProof::class);
    $this->lockout = app(AccountLockout::class);
    $this->device = app(DeviceCookie::class);
    $this->account = User::factory()->withPassword('correct horse battery')->create(['email' => 'ana@x.com']);
    $this->guess = fn (string $password, ?Request $request = null) => $this->proof->verify(
        $this->account,
        PlainPassword::of($password),
        $request ?? Request::create('/'),
    );
    $this->knownDevice = function () {
        $token = new DeviceToken($this->account->id, str_repeat('ab', 16));
        $request = Request::create('/', 'GET', cookies: [
            $this->device->name() => json_encode(['uid' => $token->userId, 'did' => $token->deviceId]),
        ]);

        return [$token, $request];
    };
});

afterEach(fn () => Carbon\Carbon::setTestNow());

it('verifies the right password', function () {
    $result = ($this->guess)('correct horse battery');

    expect($result->outcome)->toBe(ProofOutcome::Verified)
        ->and($result->retryAfter)->toBe(0);
});

it('verifies the same password typed decomposed or composed', function () {
    $account = User::factory()->withPassword("contrase\u{00F1}a larga y rara")->create();

    $result = $this->proof->verify($account, PlainPassword::of("contrasen\u{0303}a larga y rara"), Request::create('/'));

    expect($result->outcome)->toBe(ProofOutcome::Verified);
});

it('reports a wrong password', function () {
    expect(($this->guess)('nope')->outcome)->toBe(ProofOutcome::Wrong);
});

it('throttles the sixth attempt in a minute without evaluating it, even with the right password', function () {
    foreach (range(1, 5) as $ignored) {
        expect(($this->guess)('nope')->outcome)->toBe(ProofOutcome::Wrong);
    }

    $result = ($this->guess)('correct horse battery');

    expect($result->outcome)->toBe(ProofOutcome::Throttled)
        ->and($result->retryAfter)->toBeBetween(1, 60);

    $this->travel(61)->seconds();
    expect(($this->guess)('correct horse battery')->outcome)->toBe(ProofOutcome::Verified);
});

it('adds one failure to the account counter from an unknown device', function () {
    ($this->guess)('nope');

    expect($this->lockout->state('ana@x.com')->fails)->toBe(1);
});

it('adds a failure to the known device and not to the account counter', function () {
    [$token, $request] = ($this->knownDevice)();

    ($this->guess)('nope', $request);

    expect($this->lockout->state('ana@x.com')->fails)->toBe(0);
    foreach (range(1, 4) as $ignored) {
        $this->device->recordFailure($token);
    }
    expect($this->device->retryAfter($token))->toBeBetween(1, 60);
});

it('clears the account counter on success', function () {
    ($this->guess)('nope');
    ($this->guess)('nope');

    ($this->guess)('correct horse battery');

    expect($this->lockout->state('ana@x.com')->fails)->toBe(0);
});

it('clears the attempt counter on success so the next five tries are evaluated', function () {
    foreach (range(1, 4) as $ignored) {
        ($this->guess)('nope');
    }
    ($this->guess)('correct horse battery');

    foreach (range(1, 5) as $ignored) {
        expect(($this->guess)('nope')->outcome)->toBe(ProofOutcome::Wrong);
    }
});

it('is locked from an unknown device when the account has ten failures, without evaluating', function () {
    foreach (range(1, 10) as $ignored) {
        $this->lockout->recordFailure('ana@x.com');
    }

    $result = ($this->guess)('correct horse battery');

    expect($result->outcome)->toBe(ProofOutcome::Locked)
        ->and($result->retryAfter)->toBeBetween(1, 60)
        ->and($this->lockout->state('ana@x.com')->fails)->toBe(10);
});

it('does not lock the account holder with a known device', function () {
    foreach (range(1, 10) as $ignored) {
        $this->lockout->recordFailure('ana@x.com');
    }
    [, $request] = ($this->knownDevice)();

    expect(($this->guess)('correct horse battery', $request)->outcome)->toBe(ProofOutcome::Verified);
});

it('throttles a known device after five failures in a minute', function () {
    [$token, $request] = ($this->knownDevice)();
    foreach (range(1, 5) as $ignored) {
        $this->device->recordFailure($token);
    }

    $result = ($this->guess)('correct horse battery', $request);

    expect($result->outcome)->toBe(ProofOutcome::Throttled)
        ->and($result->retryAfter)->toBeBetween(1, 60);
});

it('clears the device failures on success', function () {
    [$token, $request] = ($this->knownDevice)();
    foreach (range(1, 9) as $ignored) {
        $this->device->recordFailure($token);
    }
    $this->travel(61)->seconds();

    ($this->guess)('correct horse battery', $request);
    $this->device->recordFailure($token);

    expect($this->device->read($request, $this->account))->toEqual($token);
});
