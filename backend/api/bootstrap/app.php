<?php

use App\Http\ApiExceptions;
use App\Http\Middleware\AssignRequestId;
use App\Http\Middleware\DropInvalidSession;
use App\Http\Middleware\EnsureEmailIsVerified;
use App\Http\Middleware\EnsureExpectedAccount;
use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\EnsureUserIsAdmin;
use App\Http\Middleware\RequirePassword;
use Illuminate\Auth\Middleware\Authorize;
use Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests;
use Illuminate\Contracts\Session\Middleware\AuthenticatesSessions;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Foundation\Http\Middleware\HandlePrecognitiveRequests;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;

// C3a mounts the session by hand and installs no authentication package (FR-052): never run
// `php artisan install:api`, which installs Sanctum.
return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: [
            __DIR__.'/../routes/api.php',
            __DIR__.'/../routes/api/account.php',
            __DIR__.'/../routes/api/access.php',
            __DIR__.'/../routes/api/harness.php',
            __DIR__.'/../routes/api/runs.php',
            __DIR__.'/../routes/api/sync.php',
            __DIR__.'/../routes/api/progress.php',
            __DIR__.'/../routes/api/admin-users.php',
            __DIR__.'/../routes/api/admin-invitations.php',
            __DIR__.'/../routes/api/export.php',
            __DIR__.'/../routes/api/deletion.php',
            __DIR__.'/../routes/api/progress-import.php',
            __DIR__.'/../routes/api/progress-reset.php',
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
            'account.admin' => EnsureUserIsAdmin::class,
        ]);
        // Laravel's default list without ThrottleRequests: a throttle runs where the route declares it, as the
        // C3b contract orders (throttle:admin after account.admin, password.confirm before throttle:export).
        $middleware->priority([
            HandlePrecognitiveRequests::class,
            EncryptCookies::class,
            AddQueuedCookiesToResponse::class,
            StartSession::class,
            ShareErrorsFromSession::class,
            AuthenticatesRequests::class,
            AuthenticatesSessions::class,
            SubstituteBindings::class,
            Authorize::class,
        ]);
        $middleware->prependToPriorityList(before: AuthenticatesRequests::class, prepend: EnsureUserIsActive::class);
        $middleware->group('account', ['account.active', 'auth:web', 'account.expected']);
        $middleware->group('admin', ['account.active', 'auth:web', 'account.expected', 'verified', 'account.admin', 'throttle:admin']);
        $middleware->trimStrings(except: [fn (Request $request) => $request->is('api/runs', 'api/runs/*', 'api/sync', 'api/progress/import')]);
        $middleware->convertEmptyStringsToNull(except: [fn (Request $request) => $request->is('api/runs', 'api/runs/*', 'api/sync', 'api/progress/import')]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Nginx passes only /api/, but REQUEST_URI arrives raw (/x/../api/zzz): a prefix rule would let it
        // through as HTML.
        $exceptions->shouldRenderJsonWhen(fn () => true);
        $exceptions->render(fn (Throwable $error, Request $request) => ApiExceptions::render($error, $request));
    })->create();
