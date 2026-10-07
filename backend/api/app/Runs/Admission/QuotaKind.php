<?php

namespace App\Runs\Admission;

enum QuotaKind: string
{
    case Active = 'active';
    case PerMinute = 'per_minute';
    case PerDay = 'per_day';
    case SandboxTime = 'sandbox_time';
}
