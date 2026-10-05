<?php

use App\Http\Middleware\AssignRequestId;
use App\Http\Middleware\DropInvalidSession;
use App\Http\Middleware\EnsureExpectedAccount;
use App\Http\Middleware\EnsureUserIsActive;
use Illuminate\Auth\Middleware\Authenticate;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Route;
use Tests\Feature\Session\ProbeRoutes;

beforeEach(fn () => ProbeRoutes::register());

it('runs the session middleware in the effective order the contract asks for on an account route', function () {
    $route = collect(Route::getRoutes()->getRoutes())->first(fn ($route) => $route->uri() === 'api/probe/account' && in_array('GET', $route->methods(), true));

    app(Kernel::class);
    $effective = app('router')->gatherRouteMiddleware($route);

    $expected = [
        AssignRequestId::class,
        EncryptCookies::class,
        AddQueuedCookiesToResponse::class,
        StartSession::class,
        PreventRequestForgery::class,
        DropInvalidSession::class,
        EnsureUserIsActive::class,
        Authenticate::class.':web',
        EnsureExpectedAccount::class,
    ];
    $positions = array_map(fn (string $middleware) => array_search($middleware, $effective, true), $expected);

    expect($positions)->each->not->toBeFalse()
        ->and($positions)->toBe(collect($positions)->sort()->values()->all());
});
