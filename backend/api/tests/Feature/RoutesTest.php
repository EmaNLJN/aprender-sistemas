<?php

// Nginx sólo le pasa /api/ a PHP: una ruta registrada fuera de /api sería código que nadie
// alcanza y que nadie prueba por el camino real.
it('sólo registra rutas bajo /api', function () {
    $outside = collect(app('router')->getRoutes()->getRoutes())
        ->map(fn ($route) => $route->uri())
        ->reject(fn (string $uri) => $uri === 'api' || str_starts_with($uri, 'api/'))
        ->values()
        ->all();

    expect($outside)->toBe([]);
});
