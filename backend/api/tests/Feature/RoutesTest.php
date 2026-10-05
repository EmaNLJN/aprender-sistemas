<?php

it('registers routes only under /api', function () {
    $outside = collect(app('router')->getRoutes()->getRoutes())
        ->map(fn ($route) => $route->uri())
        ->reject(fn (string $uri) => $uri === 'api' || str_starts_with($uri, 'api/'))
        ->values()
        ->all();

    expect($outside)->toBe([]);
});
