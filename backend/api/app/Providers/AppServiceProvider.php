<?php

namespace App\Providers;

use App\Auth\BlockedPasswords;
use App\Auth\Events\AccountRestricted;
use App\Auth\Limiters;
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
    }

    public function boot(): void
    {
        Limiters::register();
        RunLimiters::register();
        Event::listen(AccountRestricted::class, CancelRunsOfRestrictedAccount::class);
    }
}
