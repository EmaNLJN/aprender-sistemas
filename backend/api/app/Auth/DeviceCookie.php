<?php

namespace App\Auth;

use App\Models\User;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;
use LogicException;
use Symfony\Component\HttpFoundation\Cookie;

final class DeviceCookie
{
    private const HOST_PREFIX = '__Host-';

    private const MAX_FAILURES_PER_MINUTE = 5;

    private const WINDOW_SECONDS = 60;

    private const EXEMPTION_LOST_AT_FAILS = 10;

    private const FAILS_FORGOTTEN_AFTER_SECONDS = 86400;

    public function __construct(private Repository $config)
    {
        if (str_starts_with($this->name(), self::HOST_PREFIX) && ! $this->config->boolean('taller.device_cookie.secure')) {
            throw new LogicException('A __Host- device cookie must be Secure.');
        }
    }

    public function name(): string
    {
        return $this->config->string('taller.device_cookie.name');
    }

    public function read(Request $request, ?User $account): ?DeviceToken
    {
        if ($account === null) {
            return null;
        }

        $token = $this->decode($request->cookie($this->name()));

        if ($token === null || $token->userId !== $account->id) {
            return null;
        }

        return $this->consecutiveFailures($token) >= self::EXEMPTION_LOST_AT_FAILS ? null : $token;
    }

    public function make(User $account, ?DeviceToken $current): Cookie
    {
        $deviceId = $current === null ? bin2hex(random_bytes(16)) : $current->deviceId;
        $expires = now()->addDays($this->config->integer('taller.device_cookie.days'))->getTimestamp();

        return new Cookie(
            $this->name(),
            json_encode(['uid' => $account->id, 'did' => $deviceId], JSON_THROW_ON_ERROR),
            $expires,
            '/',
            null,
            $this->config->boolean('taller.device_cookie.secure'),
            true,
            false,
            $this->sameSite(),
        );
    }

    public function retryAfter(DeviceToken $device): ?int
    {
        $key = $this->attemptsKey($device);

        return RateLimiter::tooManyAttempts($key, self::MAX_FAILURES_PER_MINUTE)
            ? max(1, RateLimiter::availableIn($key))
            : null;
    }

    public function recordFailure(DeviceToken $device): void
    {
        RateLimiter::hit($this->attemptsKey($device), self::WINDOW_SECONDS);
        Cache::put($this->failsKey($device), $this->consecutiveFailures($device) + 1, self::FAILS_FORGOTTEN_AFTER_SECONDS);
    }

    public function clear(DeviceToken $device): void
    {
        RateLimiter::clear($this->attemptsKey($device));
        Cache::forget($this->failsKey($device));
    }

    /** @return 'lax'|'strict'|'none' */
    private function sameSite(): string
    {
        return match ($this->config->string('taller.device_cookie.same_site')) {
            'lax' => 'lax',
            'strict' => 'strict',
            'none' => 'none',
            default => throw new LogicException('taller.device_cookie.same_site must be lax, strict or none.'),
        };
    }

    private function decode(mixed $value): ?DeviceToken
    {
        $content = is_string($value) ? json_decode($value, true) : null;

        if (! is_array($content) || ! is_int($content['uid'] ?? null) || ! is_string($content['did'] ?? null)) {
            return null;
        }

        return preg_match('/^[0-9a-f]{32}$/', $content['did']) === 1
            ? new DeviceToken($content['uid'], $content['did'])
            : null;
    }

    private function consecutiveFailures(DeviceToken $device): int
    {
        $fails = Cache::get($this->failsKey($device));

        return is_int($fails) ? $fails : 0;
    }

    private function attemptsKey(DeviceToken $device): string
    {
        return 'login:device-attempts:'.$device->deviceId;
    }

    private function failsKey(DeviceToken $device): string
    {
        return 'login:device-fails:'.$device->deviceId;
    }
}
