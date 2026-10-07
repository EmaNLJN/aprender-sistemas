<?php

use Illuminate\Console\Scheduling\Event;
use Illuminate\Console\Scheduling\Schedule;

/** @return array<string, array{string, bool}> command => expression and withoutOverlapping */
function scheduledTasks(): array
{
    $tasks = [];
    foreach (app(Schedule::class)->events() as $event) {
        /** @var Event $event */
        $command = str_replace("'", '', (string) preg_replace('/^.*?artisan\'? /', '', (string) $event->command));
        $tasks[$command] = [$event->expression, $event->withoutOverlapping];
    }

    return $tasks;
}

it('schedules exactly the eight tasks of the contracts, none overlapping and none processing a queue', function () {
    $tasks = scheduledTasks();

    expect($tasks)->toHaveCount(8)
        ->and($tasks['taller:prune-sessions'][0])->toBe('*/15 * * * *')
        ->and($tasks['auth:clear-resets'][0])->toBe('*/15 * * * *')
        ->and($tasks['taller:prune-cache'][0])->toBe('*/15 * * * *')
        ->and($tasks['model:prune --model=App\\Models\\Invitation'][0])->toBe('0 0 * * *')
        ->and($tasks['runs:sweep'][0])->toBe('* * * * *')
        ->and($tasks['runs:prune'][0])->toBe('0 * * * *')
        ->and($tasks['progress:prune-sync-operations'][0])->toBe('0 * * * *')
        ->and($tasks['progress:prune-import-payloads'][0])->toBe('0 * * * *');
    foreach ($tasks as $command => [, $withoutOverlapping]) {
        expect($withoutOverlapping)->toBeTrue()->and($command)->not->toContain('queue:work');
    }
});
