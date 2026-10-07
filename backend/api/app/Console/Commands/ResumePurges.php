<?php

namespace App\Console\Commands;

use App\Accounts\PurgeLog;
use App\Auth\AccountStatus;
use App\Jobs\PurgeUserData;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Queue\Events\UniqueJobSkipped;
use Illuminate\Support\Facades\Event;

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

        $resumed = 0;
        $alreadyQueued = 0;
        $skippedJobs = 0;
        Event::listen(UniqueJobSkipped::class, function () use (&$skippedJobs) {
            $skippedJobs++;
        });

        try {
            foreach ($stuck as $account) {
                $skippedBefore = $skippedJobs;
                PurgeUserData::dispatch($account->id);
                if ($skippedJobs > $skippedBefore) {
                    $alreadyQueued++;
                } else {
                    $resumed++;
                    PurgeLog::resumed($account->id);
                }
            }
        } finally {
            Event::forget(UniqueJobSkipped::class);
        }

        $this->info(($resumed === 1 ? '1 purga retomada' : "{$resumed} purgas retomadas").", {$alreadyQueued} ya en la cola");

        return self::SUCCESS;
    }
}
