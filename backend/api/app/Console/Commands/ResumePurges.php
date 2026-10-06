<?php

namespace App\Console\Commands;

use App\Auth\AccountStatus;
use App\Jobs\PurgeUserData;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

final class ResumePurges extends Command
{
    protected $signature = 'taller:resume-purges';

    protected $description = 'Vuelve a pedir la purga de las cuentas que llevan demasiado tiempo en deleting';

    public function handle(): int
    {
        $stuckSince = now()->subMinutes(config()->integer('taller.purge.stuck_minutes'));
        $stuck = User::query()
            ->where('status', AccountStatus::Deleting->value)
            ->where('updated_at', '<', $stuckSince)
            ->orderBy('id')
            ->get();

        foreach ($stuck as $account) {
            PurgeUserData::dispatch($account->id);
            Log::info('purge.resumed', ['user_id' => $account->id]);
        }

        $count = $stuck->count();
        $this->info($count === 1 ? '1 purga retomada' : "{$count} purgas retomadas");

        return self::SUCCESS;
    }
}
