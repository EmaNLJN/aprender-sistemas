<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

// API-only (ADR 0004): sin rutas web. routes/api.php recibe el prefijo /api y el grupo de
// middleware `api`; el health check queda en /api/up para entrar por la misma location de
// Nginx. Nunca `php artisan install:api`: instala Sanctum, que llega en C3 con composer require.
return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/api/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Bajo /api los errores son JSON aunque el cliente no lo pida (navegador, curl). La raíz
        // /api/ llega como `api`: Laravel recorta la barra final y `api/*` no la cubre.
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api', 'api/*') || $request->expectsJson(),
        );
    })->create();
