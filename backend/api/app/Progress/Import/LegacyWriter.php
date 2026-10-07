<?php

namespace App\Progress\Import;

use App\Progress\Import\Legacy\LegacyProgress;
use Carbon\CarbonImmutable;

interface LegacyWriter
{
    public function write(int $userId, int $epoch, LegacyProgress $progress, int $revision, CarbonImmutable $now): WrittenRows;
}
