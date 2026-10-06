<?php

namespace App\Console\Commands;

use App\Auth\AccountStatus;
use App\Jobs\PurgeUserData;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

final class ResumePurges extends Command
{
    protected $signature = 'taller:resume-purges';

    protected $description = 'Vuelve a pedir la purga de las cuentas que llevan demasiado tiempo en deleting';

    public function handle(): int
    {
        $stuckSince = now()->subMinutes(config()->integer('taller.purge.stuck_minutes'));
        $userIds = DB::table('users')
            ->where('status', AccountStatus::Deleting->value)
            ->where('updated_at', '<', $stuckSince)
            ->orderBy('id')
            ->pluck('id');

        foreach ($userIds as $userId) {
            PurgeUserData::dispatch((int) $userId);
            Log::info('purge.resumed', ['user_id' => (int) $userId]);
        }

        $count = $userIds->count();
        $this->info($count === 1 ? '1 purga retomada' : "{$count} purgas retomadas");

        return self::SUCCESS;
    }
}
