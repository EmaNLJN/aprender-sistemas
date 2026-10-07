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

it('schedules exactly the ten tasks of the contracts, none overlapping', function () {
    $tasks = scheduledTasks();

    expect($tasks)->toHaveCount(10)
        ->and($tasks['taller:prune-sessions'][0])->toBe('*/15 * * * *')
        ->and($tasks['auth:clear-resets'][0])->toBe('*/15 * * * *')
        ->and($tasks['taller:prune-cache'][0])->toBe('*/15 * * * *')
        ->and($tasks['model:prune --model=App\\Models\\Invitation'][0])->toBe('0 0 * * *')
        ->and($tasks['runs:sweep'][0])->toBe('* * * * *')
        ->and($tasks['runs:prune'][0])->toBe('0 * * * *')
        ->and($tasks['queue:work database --queue=default --stop-when-empty --max-time=50'][0])->toBe('* * * * *')
        ->and($tasks['queue:prune-failed --hours=168'][0])->toBe('0 0 * * *')
        ->and($tasks['model:prune --model=App\\Models\\DeletedAccount'][0])->toBe('0 0 * * *')
        ->and($tasks['taller:resume-purges'][0])->toBe('*/5 * * * *');
    foreach ($tasks as [, $withoutOverlapping]) {
        expect($withoutOverlapping)->toBeTrue();
    }
});

it('works only the default queue, in a single worker whose overlap lock expires after ten minutes', function () {
    $workers = collect(app(Schedule::class)->events())->filter(fn (Event $event) => str_contains((string) $event->command, 'queue:work'));

    expect($workers)->toHaveCount(1)
        ->and((string) $workers->first()?->command)->toContain('--queue=default')
        ->and($workers->first()?->expiresAt)->toBe(10);
    foreach (array_keys(scheduledTasks()) as $command) {
        expect($command)->not->toMatch('/--queue=\\S*runs/');
    }
});

it('appends the output of every task to the stderr of the scheduler container, so its logs reach docker compose logs', function () {
    foreach (app(Schedule::class)->events() as $event) {
        expect([$event->output, $event->shouldAppendOutput])->toBe(['/proc/1/fd/2', true]);
    }
});
