<?php

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
Schedule::command('progress:prune-sync-operations')->hourly()->withoutOverlapping();
