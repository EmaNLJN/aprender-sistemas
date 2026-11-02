<?php

namespace App\Stats;

use App\Runs\Record\Instant;
use Closure;
use Illuminate\Support\Facades\Cache;

final class StatsCache
{
    /**
     * @param  Closure(): array<string, mixed>  $compute
     * @return array{data: array<string, mixed>, generatedAt: string}
     */
    public function remember(string $view, string $parameters, Closure $compute): array
    {
        $key = 'stats:v1:'.$view.':'.hash('sha256', $parameters);

        return Cache::store()->remember(
            $key,
            config()->integer('stats.cache_seconds'),
            fn (): array => ['data' => $compute(), 'generatedAt' => Instant::iso(Instant::now())],
        );
    }
}
