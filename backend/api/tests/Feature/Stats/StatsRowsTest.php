<?php

use App\Http\StatsTimeout;
use App\Models\User;
use App\Stats\StatsRows;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

it('adds the time limit hint right after the first select', function () {
    DB::flushQueryLog();
    DB::enableQueryLog();

    app(StatsRows::class)->select("select\n  1 as `one`", [], 'probe');

    expect(DB::getQueryLog()[0]['query'])->toBe("select /*+ MAX_EXECUTION_TIME(5000) */\n  1 as `one`");
});

it('refuses a statement that is not a select', function () {
    app(StatsRows::class)->select('update `users` set `name` = `name`', [], 'users');
})->throws(LogicException::class);

it('returns each row as fields', function () {
    $first = User::factory()->create();
    $second = User::factory()->create();

    $rows = app(StatsRows::class)->select('select `id` from `users` order by `id`', [], 'users');

    expect(array_map(fn ($row) => $row->int('id'), $rows))->toBe([$first->id, $second->id])
        ->and(app(StatsRows::class)->one('select count(*) as `n` from `users`', [], 'users')->int('n'))->toBe(2);
});

it('turns an interrupted select into StatsTimeout and logs its duration without a route', function () {
    config(['stats.max_execution_ms' => 100]);
    User::factory()->create();
    Log::spy();

    $caught = null;
    try {
        app(StatsRows::class)->select('select 1 as `one` from `users` where sleep(1) = 0', [], 'users');
    } catch (StatsTimeout $timeout) {
        $caught = $timeout;
    }

    expect($caught)->not->toBeNull()
        ->and($caught->getResponse()->getStatusCode())->toBe(503)
        ->and($caught->getResponse()->headers->get('Retry-After'))->toBe('30');
    Log::shouldHaveReceived('warning')->once()->withArgs(fn (string $message, array $context = []) => $message === 'admin.stats_timeout'
        && $context['route'] === 'none' && is_int($context['duration_ms']) && $context['duration_ms'] >= 50);
});
