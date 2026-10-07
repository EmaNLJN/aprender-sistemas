<?php

namespace App\Providers;

use App\Auth\BlockedPasswords;
use App\Auth\Events\AccountRestricted;
use App\Auth\Limiters;
use App\Http\ProgressLimiters;
use App\Progress\ChangesReader;
use App\Progress\Operations\DatabaseOperationProcessor;
use App\Progress\Operations\OperationProcessor;
use App\Progress\Snapshot\ProgressSnapshotReader;
use App\Runs\Evidence\ResultClassifier;
use App\Runs\Execution\CancelRunsOfRestrictedAccount;
use App\Runs\Execution\RunExecution;
use App\Runs\Execution\RunProcessor;
use App\Runs\RunLimiters;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(BlockedPasswords::class, fn () => new BlockedPasswords(config()->string('taller.password_blocklist')));
        $this->app->bind(RunProcessor::class, RunExecution::class);
        $this->app->when(ResultClassifier::class)->needs('$sandboxRuntime')->giveConfig('runs.executor.runtime');
        $this->app->bind(OperationProcessor::class, DatabaseOperationProcessor::class);
        $this->app->bind(ChangesReader::class, ProgressSnapshotReader::class);
    }

    public function boot(): void
    {
        Limiters::register();
        RunLimiters::register();
        ProgressLimiters::register();
        Event::listen(AccountRestricted::class, CancelRunsOfRestrictedAccount::class);
    }
}
