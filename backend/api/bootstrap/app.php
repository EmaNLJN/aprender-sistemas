<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors;

// Never run `php artisan install:api`: it installs Sanctum, which arrives in C3 with composer require.
return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/api/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->remove(HandleCors::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Nginx passes only /api/, but REQUEST_URI arrives raw (/x/../api/zzz): a prefix rule would let it
        // through as HTML.
        $exceptions->shouldRenderJsonWhen(fn () => true);
    })->create();
