<?php

use App\Http\Middleware\EnsureEmailIsVerified;
use App\Http\Middleware\EnsureExpectedAccount;
use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\EnsureUserIsAdmin;
use App\Http\Middleware\RequirePassword;
use Illuminate\Auth\Middleware\Authenticate;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Route;

/**
 * @param  list<string>  $contractOrder
 * @return list<string>
 */
function effectiveOrderOf(string $method, string $uri, array $contractOrder): array
{
    $route = Route::getRoutes()->match(Request::create($uri, $method));
    app(Kernel::class);
    $effective = array_filter(Route::gatherRouteMiddleware($route), fn ($middleware) => is_string($middleware));

    return array_values(array_intersect($effective, $contractOrder));
}

it('evaluates an admin route in the order of the contract: the throttle after the role, before password.confirm', function () {
    $contractOrder = [
        EnsureUserIsActive::class,
        Authenticate::class.':web',
        EnsureExpectedAccount::class,
        EnsureEmailIsVerified::class,
        EnsureUserIsAdmin::class,
        ThrottleRequests::class.':admin',
        RequirePassword::class,
    ];

    expect(effectiveOrderOf('PATCH', '/api/admin/users/1', $contractOrder))->toBe($contractOrder);
});

it('confirms the password before the export throttle, so a request without it spends no quota', function () {
    $contractOrder = [
        EnsureUserIsActive::class,
        Authenticate::class.':web',
        EnsureExpectedAccount::class,
        RequirePassword::class,
        ThrottleRequests::class.':export',
    ];

    expect(effectiveOrderOf('POST', '/api/me/export', $contractOrder))->toBe($contractOrder);
});
