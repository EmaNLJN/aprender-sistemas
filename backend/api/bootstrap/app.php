<?php

use App\Http\ApiExceptions;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Http\Request;

// C3a mounts the session by hand and installs no authentication package (FR-052): never run
// `php artisan install:api`, which installs Sanctum.
return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: [
            __DIR__.'/../routes/api.php',
            __DIR__.'/../routes/api/account.php',
            __DIR__.'/../routes/api/access.php',
        ],
        commands: __DIR__.'/../routes/console.php',
        health: '/api/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->remove(HandleCors::class);
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Nginx passes only /api/, but REQUEST_URI arrives raw (/x/../api/zzz): a prefix rule would let it
        // through as HTML.
        $exceptions->shouldRenderJsonWhen(fn () => true);
        $exceptions->render(fn (Throwable $error, Request $request) => ApiExceptions::render($error, $request));
    })->create();
