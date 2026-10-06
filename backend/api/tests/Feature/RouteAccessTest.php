<?php

use App\Http\Middleware\EnsureExpectedAccount;
use App\Http\Middleware\EnsureUserIsActive;
use Illuminate\Auth\Middleware\Authenticate;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Routing\Route as RoutingRoute;
use Illuminate\Support\Facades\Route;

const PUBLIC_ROUTES = [
    'api/up',
    'api/session',
    'api/auth/login',
    'api/auth/invitations/lookup',
    'api/auth/invitations/accept',
    'api/auth/reset-password',
];

const MODIFYING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/** @return list<RoutingRoute> */
function apiRoutes(): array
{
    return collect(Route::getRoutes()->getRoutes())
        ->filter(fn (RoutingRoute $route) => str_starts_with($route->uri(), 'api/'))
        ->values()
        ->all();
}

/** @return list<string> */
function middlewareOf(RoutingRoute $route): array
{
    app(Kernel::class);
    $router = app('router');

    return array_map('strval', $router->resolveMiddleware($router->gatherRouteMiddleware($route), $route->excludedMiddleware()));
}

function modifies(RoutingRoute $route): bool
{
    return array_intersect($route->methods(), MODIFYING_METHODS) !== [];
}

/**
 * What a route that is not on the allow-list lacks: the session guard, the account check and, if it
 * modifies, the expected-account check. Closed by default: a new route has to opt out by name.
 *
 * @return list<string>
 */
function missingProtection(RoutingRoute $route): array
{
    if (in_array($route->uri(), PUBLIC_ROUTES, true)) {
        return [];
    }
    $middleware = middlewareOf($route);
    $required = [Authenticate::class.':web', EnsureUserIsActive::class];
    if (modifies($route)) {
        $required[] = EnsureExpectedAccount::class;
    }

    return array_values(array_diff($required, $middleware));
}

it('has every public route of the allow-list and no other one without the account group', function () {
    $unprotected = collect(apiRoutes())
        ->filter(fn (RoutingRoute $route) => missingProtection($route) !== [])
        ->map(fn (RoutingRoute $route) => implode('|', $route->methods()).' '.$route->uri())
        ->values()
        ->all();
    $uris = collect(apiRoutes())->map(fn (RoutingRoute $route) => $route->uri());

    expect($unprotected)->toBe([])
        ->and(array_values(array_diff(PUBLIC_ROUTES, $uris->all())))->toBe([]);
});

it('flags a route that nobody protected and is not on the allow-list', function () {
    $invented = Route::get('api/invented', fn () => 'data');

    expect(missingProtection($invented))->toBe([Authenticate::class.':web', EnsureUserIsActive::class]);
});

it('flags a route that modifies and lacks the expected-account check', function () {
    $invented = Route::post('api/invented', fn () => 'data')->middleware(['auth:web', 'account.active']);

    expect(missingProtection($invented))->toBe([EnsureExpectedAccount::class]);
});

it('answers 401 unauthenticated in JSON to every protected GET route, without a session and without Accept', function () {
    $protectedReads = collect(apiRoutes())
        ->reject(fn (RoutingRoute $route) => in_array($route->uri(), PUBLIC_ROUTES, true))
        ->reject(fn (RoutingRoute $route) => modifies($route))
        ->values();

    foreach ($protectedReads as $route) {
        $response = $this->get('/'.str_replace(['{id}', '{user}', '{invitation}'], ['rust-01', '1', '1'], $route->uri()));

        $response->assertStatus(401)->assertExactJson(['message' => 'Iniciá sesión para continuar.', 'code' => 'unauthenticated']);
        expect($response->headers->get('Content-Type'))->toContain('application/json');
    }
    expect($protectedReads->count())->toBeGreaterThanOrEqual(7);
});
