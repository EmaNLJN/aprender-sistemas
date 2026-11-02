<?php

use App\Models\User;
use App\Stats\StatsCache;
use App\Stats\StatsRows;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Tests\Support\Browser;

it('answers 503 stats_timeout through HTTP, caches nothing and logs the route template once', function () {
    config(['stats.max_execution_ms' => 100]);
    Route::middleware(['api', 'admin'])->get('api/admin/probe-timeout/{user}', fn (StatsCache $cache, StatsRows $rows) => response()->json(
        $cache->remember('probe', 'p', fn (): array => ['n' => $rows->one('select 1 as `n` from `users` where sleep(1) = 0', [], 'users')->int('n')]),
    ));
    app('router')->getRoutes()->refreshNameLookups();
    $admin = User::factory()->admin()->create();
    $browser = Browser::for($this)->useDatabaseDrivers()->signIn($admin);
    Log::spy();

    $response = $browser->get("/api/admin/probe-timeout/{$admin->id}");

    $response->assertStatus(503)->assertJsonPath('code', 'stats_timeout')->assertHeader('Retry-After', '30');
    expect($response->json('message'))->toBe('Las estadísticas tardaron demasiado. Probá de nuevo en un rato.')
        ->and(DB::table('cache')->where('key', 'like', '%stats:v1:%')->count())->toBe(0);
    Log::shouldHaveReceived('warning')->once()->withArgs(fn (string $message, array $context = []) => $message === 'admin.stats_timeout'
        && $context['route'] === 'api/admin/probe-timeout/{user}');
});
