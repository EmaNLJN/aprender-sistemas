<?php

use App\Stats\StatsCache;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    config(['cache.default' => 'database']);
    Cache::purge();
    $this->travelTo(CarbonImmutable::parse('2026-10-20 15:00:00', 'UTC'));
});

it('keeps the computed data for ten minutes and computes it again after', function () {
    $calls = 0;
    $compute = function () use (&$calls): array {
        $calls++;

        return ['calls' => $calls];
    };

    $first = app(StatsCache::class)->remember('overview', 'p', $compute);
    $this->travel(599)->seconds();
    $second = app(StatsCache::class)->remember('overview', 'p', $compute);
    $this->travel(2)->seconds();
    $third = app(StatsCache::class)->remember('overview', 'p', $compute);

    expect($first)->toBe(['data' => ['calls' => 1], 'generatedAt' => '2026-10-20T15:00:00.000Z'])
        ->and($second)->toBe($first)
        ->and($third)->toBe(['data' => ['calls' => 2], 'generatedAt' => '2026-10-20T15:10:01.000Z']);
});

it('keeps apart the views and the parameters', function () {
    $cache = app(StatsCache::class);

    $cache->remember('overview', 'a', fn (): array => ['n' => 1]);

    expect($cache->remember('overview', 'b', fn (): array => ['n' => 2])['data'])->toBe(['n' => 2])
        ->and($cache->remember('exercises', 'a', fn (): array => ['n' => 3])['data'])->toBe(['n' => 3]);
});

it('stores nothing when the computation fails', function () {
    $cache = app(StatsCache::class);

    expect(fn () => $cache->remember('overview', 'p', fn (): array => throw new RuntimeException('boom')))->toThrow(RuntimeException::class)
        ->and(DB::table('cache')->where('key', 'like', '%stats:v1:%')->count())->toBe(0)
        ->and($cache->remember('overview', 'p', fn (): array => ['n' => 1])['data'])->toBe(['n' => 1]);
});
