<?php

namespace App\Stats\Accounts;

use Illuminate\Support\Facades\Log;

final class StudentAccessLog
{
    public function viewed(int $targetId, string $view): void
    {
        Log::info('admin.student_viewed', ['target_id' => $targetId, 'view' => $view]);
    }
}
