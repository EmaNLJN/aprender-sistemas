<?php

namespace App\Auth;

use Carbon\CarbonImmutable;

final readonly class IssuedResetLink
{
    public function __construct(public string $url, public CarbonImmutable $expiresAt) {}
}
