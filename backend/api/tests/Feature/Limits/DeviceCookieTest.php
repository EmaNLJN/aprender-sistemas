<?php

use App\Auth\DeviceCookie;
use App\Auth\DeviceToken;
use App\Models\User;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Sleep;
use Tests\Feature\Limits\DatabaseDrivers;

beforeEach(function () {
    DatabaseDrivers::useWithFixedClock();
    $this->device = app(DeviceCookie::class);
    $this->account = User::factory()->create();

    Route::middleware(EncryptCookies::class)->prefix('api')->group(function () {
        Route::get('/probe/device/make/{user}', function (int $user, Request $request) {
            $user = User::findOrFail($user);
            $current = app(DeviceCookie::class)->read($request, $user);

            return response('issued')->withCookie(app(DeviceCookie::class)->make($user, $current));
        });
        Route::get('/probe/device/read/{user}', function (int $user, Request $request) {
            $token = app(DeviceCookie::class)->read($request, User::findOrFail($user));

            return response()->json($token === null ? null : ['uid' => $token->userId, 'did' => $token->deviceId]);
        });
    });

    $this->requestWith = fn (?string $value, User $user) => Request::create('/', 'GET', cookies: $value === null ? [] : [$this->device->name() => $value])
        ->setUserResolver(fn () => $user);
});

afterEach(function () {
    Carbon::setTestNow();
    Sleep::fake(false);
});

function issuedDevice(object $test, User $user): array
{
    $response = $test->get("/api/probe/device/make/{$user->id}");

    return [$response, $response->getCookie($test->device->name(), false)->getValue()];
}

it('round trips through an encrypted cookie that is not readable JSON', function () {
    [$response, $raw] = issuedDevice($this, $this->account);

    expect(json_decode($raw))->toBeNull();

    $read = $this->withCredentials()->withUnencryptedCookie($this->device->name(), $raw)
        ->getJson("/api/probe/device/read/{$this->account->id}")
        ->assertOk();

    expect($read->json('uid'))->toBe($this->account->id)
        ->and($read->json('did'))->toMatch('/^[0-9a-f]{32}$/');
});

it('names the cookie from the configuration and defaults to taller-device', function () {
    expect($this->device->name())->toBe('taller-device');

    config(['taller.device_cookie.name' => 'otra-cookie']);

    expect((new DeviceCookie(app('config')))->name())->toBe('otra-cookie');
});

it('emits HttpOnly, SameSite Lax, path slash and no Domain, expiring in 180 days', function () {
    [$response] = issuedDevice($this, $this->account);

    $cookie = $response->getCookie($this->device->name());

    expect($cookie->isHttpOnly())->toBeTrue()
        ->and($cookie->isSecure())->toBeFalse()
        ->and($cookie->getPath())->toBe('/')
        ->and($cookie->getDomain())->toBeNull()
        ->and(strtolower((string) $cookie->getSameSite()))->toBe('lax')
        ->and($cookie->getExpiresTime())->toBe(now()->addDays(180)->getTimestamp());
});

it('follows the configuration into a __Host- cookie: Secure, path slash, no Domain', function () {
    config(['taller.device_cookie.name' => '__Host-taller-device', 'taller.device_cookie.secure' => true]);

    $cookie = (new DeviceCookie(app('config')))->make($this->account, null);

    expect($cookie->getName())->toBe('__Host-taller-device')
        ->and($cookie->isSecure())->toBeTrue()
        ->and($cookie->isHttpOnly())->toBeTrue()
        ->and($cookie->getPath())->toBe('/')
        ->and($cookie->getDomain())->toBeNull();
});

it('refuses a __Host- name without Secure', function () {
    config(['taller.device_cookie.name' => '__Host-taller-device', 'taller.device_cookie.secure' => false]);

    expect(fn () => new DeviceCookie(app('config')))->toThrow(LogicException::class);
});

it('renews the cookie with the same device id and a fresh expiry', function () {
    $current = new DeviceToken($this->account->id, str_repeat('ab', 16));
    $this->travel(10)->days();

    $cookie = $this->device->make($this->account, $current);

    expect(json_decode($cookie->getValue(), true))->toBe(['uid' => $this->account->id, 'did' => str_repeat('ab', 16)])
        ->and($cookie->getExpiresTime())->toBe(now()->addDays(180)->getTimestamp());
});

it('reads null for another account, no cookie or a content that is not uid and did', function (?string $value) {
    $other = User::factory()->create();

    expect($this->device->read(($this->requestWith)($value, $other), $other))->toBeNull();
})->with([
    'no cookie' => [null],
    'not JSON' => ['hello'],
    'a list' => ['[1,2]'],
    'missing did' => ['{"uid":1}'],
    'did not hexadecimal' => ['{"uid":1,"did":"zz"}'],
    'uid as text' => ['{"uid":"1","did":"abababababababababababababababab"}'],
]);

it('reads null when the cookie belongs to another account', function () {
    $other = User::factory()->create();
    $value = json_encode(['uid' => $this->account->id, 'did' => str_repeat('cd', 16)]);

    expect($this->device->read(($this->requestWith)($value, $other), $other))->toBeNull()
        ->and($this->device->read(($this->requestWith)($value, $this->account), $this->account))->toEqual(new DeviceToken($this->account->id, str_repeat('cd', 16)))
        ->and($this->device->read(($this->requestWith)($value, $this->account), null))->toBeNull();
});

it('asks to wait after five failures in a minute and lets go after 61 seconds', function () {
    $token = new DeviceToken($this->account->id, str_repeat('ef', 16));

    foreach (range(1, 4) as $ignored) {
        $this->device->recordFailure($token);
    }
    expect($this->device->retryAfter($token))->toBeNull();

    $this->device->recordFailure($token);
    expect($this->device->retryAfter($token))->toBeBetween(1, 60);

    $this->travel(61)->seconds();
    expect($this->device->retryAfter($token))->toBeNull();
});

it('stops exempting a device after ten consecutive failures and clear reverts it', function () {
    $token = new DeviceToken($this->account->id, str_repeat('12', 16));
    $request = ($this->requestWith)(json_encode(['uid' => $this->account->id, 'did' => $token->deviceId]), $this->account);

    foreach (range(1, 9) as $ignored) {
        $this->device->recordFailure($token);
    }
    expect($this->device->read($request, $this->account))->toEqual($token);

    $this->device->recordFailure($token);
    expect($this->device->read($request, $this->account))->toBeNull();

    $this->device->clear($token);
    expect($this->device->read($request, $this->account))->toEqual($token)
        ->and($this->device->retryAfter($token))->toBeNull();
});

it('counts device failures one by one from one and forgets them 24 hours after the last', function () {
    $token = new DeviceToken($this->account->id, str_repeat('34', 16));
    $failsKey = 'login:device-fails:'.$token->deviceId;

    $this->device->recordFailure($token);
    expect(Cache::get($failsKey))->toBe(1);

    $this->travel(23)->hours();
    $this->device->recordFailure($token);
    expect(Cache::get($failsKey))->toBe(2);

    $this->travel(23)->hours();
    expect(Cache::get($failsKey))->toBe(2);

    $this->travel(2)->hours();
    expect(Cache::get($failsKey))->toBeNull();
});

it('fails instead of writing a stale device counter while another request holds the lock', function () {
    Sleep::fake(syncWithCarbon: true);
    $token = new DeviceToken($this->account->id, str_repeat('56', 16));
    $lock = Cache::lock('login:device-lock:'.$token->deviceId, 5);
    $lock->get();

    expect(fn () => $this->device->recordFailure($token))->toThrow(LockTimeoutException::class);
    $lock->release();

    expect(Cache::get('login:device-fails:'.$token->deviceId))->toBeNull();
});
