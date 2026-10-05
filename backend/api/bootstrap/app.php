<?php

use App\Http\ApiExceptions;
use App\Http\Middleware\AssignRequestId;
use App\Http\Middleware\DropInvalidSession;
use App\Http\Middleware\EnsureEmailIsVerified;
use App\Http\Middleware\EnsureExpectedAccount;
use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\RequirePassword;
use Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\StartSession;

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
        $middleware->api(prepend: [
            AssignRequestId::class,
            EncryptCookies::class,
            AddQueuedCookiesToResponse::class,
            StartSession::class,
            PreventRequestForgery::class,
            DropInvalidSession::class,
        ]);
        $middleware->alias([
            'verified' => EnsureEmailIsVerified::class,
            'password.confirm' => RequirePassword::class,
            'account.active' => EnsureUserIsActive::class,
            'account.expected' => EnsureExpectedAccount::class,
        ]);
        $middleware->prependToPriorityList(before: AuthenticatesRequests::class, prepend: EnsureUserIsActive::class);
        $middleware->group('account', ['account.active', 'auth:web', 'account.expected']);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Nginx passes only /api/, but REQUEST_URI arrives raw (/x/../api/zzz): a prefix rule would let it
        // through as HTML.
        $exceptions->shouldRenderJsonWhen(fn () => true);
        $exceptions->render(fn (Throwable $error, Request $request) => ApiExceptions::render($error, $request));
    })->create();
