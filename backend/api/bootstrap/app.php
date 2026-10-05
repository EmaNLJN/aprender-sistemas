<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors;

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
        // Mismo origen que el front (ADR 0004): sin CORS. HandleCors viene en el stack global.
        $middleware->remove(HandleCors::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // API-only: todo error es JSON, aunque el cliente no lo pida (navegador, curl). Nginx sólo
        // le pasa /api/ a PHP (RoutesTest fija que no hay otras rutas), pero el REQUEST_URI llega
        // crudo (/x/../api/zzz) y una regla por prefijo lo dejaría pasar como HTML.
        $exceptions->shouldRenderJsonWhen(fn () => true);
    })->create();
