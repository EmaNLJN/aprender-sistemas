<?php

namespace App\Auth;

final readonly class DeviceToken
{
    public function __construct(public int $userId, public string $deviceId) {}
}
