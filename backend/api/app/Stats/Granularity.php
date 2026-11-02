<?php

namespace App\Stats;

enum Granularity: string
{
    case Day = 'day';
    case Week = 'week';
    case Month = 'month';
}
