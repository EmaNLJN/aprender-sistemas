<?php

use App\Models\DeletedAccount;
use App\Models\Invitation;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('taller:prune-sessions')->everyFifteenMinutes()->withoutOverlapping();
Schedule::command('auth:clear-resets')->everyFifteenMinutes()->withoutOverlapping();
Schedule::command('taller:prune-cache')->everyFifteenMinutes()->withoutOverlapping();
Schedule::command('model:prune', ['--model' => Invitation::class])->daily()->withoutOverlapping();
Schedule::command('runs:sweep')->everyMinute()->withoutOverlapping();
Schedule::command('runs:prune')->hourly()->withoutOverlapping();
Schedule::command('queue:work database --queue=default --stop-when-empty --max-time=50')->everyMinute()->withoutOverlapping(10);
Schedule::command('queue:prune-failed', ['--hours' => 168])->daily()->withoutOverlapping();
Schedule::command('model:prune', ['--model' => DeletedAccount::class])->daily()->withoutOverlapping();
Schedule::command('taller:resume-purges')->everyFiveMinutes()->withoutOverlapping();
