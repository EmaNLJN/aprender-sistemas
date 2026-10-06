<?php

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Tests\Support\Browser;

const OPEN_ROUTES = [
    'api/up',
    'api/session',
    'api/auth/login',
    'api/auth/invitations/lookup',
    'api/auth/invitations/accept',
    'api/auth/reset-password',
];

/** @return list<array{string, string}> the method and path of every protected route that modifies */
function protectedModifyingRoutes(): array
{
    $routes = [];
    foreach (Route::getRoutes()->getRoutes() as $route) {
        $isTestHelper = $route->getName() === 'browser.sign-in';
        $isProtected = str_starts_with($route->uri(), 'api/') && ! in_array($route->uri(), OPEN_ROUTES, true) && ! $isTestHelper;
        $modifiers = array_values(array_intersect($route->methods(), ['POST', 'PUT', 'PATCH', 'DELETE']));
        if ($isProtected && $modifiers !== []) {
            $routes[] = [$modifiers[0], '/'.$route->uri()];
        }
    }

    return $routes;
}

/** @return list<string> */
function writesOutsideSessionAndCache(): array
{
    return collect(DB::getQueryLog())
        ->pluck('query')
        ->filter(fn (string $query) => preg_match('/^\s*(insert|update|delete|replace|truncate)\b/i', $query) === 1)
        ->reject(fn (string $query) => preg_match('/`(sessions|cache|cache_locks)`/i', $query) === 1)
        ->values()
        ->all();
}

beforeEach(function () {
    $this->accountA = User::factory()->create(['name' => 'Ana']);
    $this->accountB = User::factory()->create(['name' => 'Beto']);
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->accountA);
});

it('covers all the routes that modify, so a new one cannot escape the matrix', function () {
    expect(collect(protectedModifyingRoutes())->pluck(1)->sort()->values()->all())->toBe([
        '/api/admin/invitations',
        '/api/admin/invitations/{invitation}',
        '/api/admin/invitations/{invitation}/resend',
        '/api/admin/users/{user}',
        '/api/admin/users/{user}/password-reset',
        '/api/auth/confirm-password',
        '/api/auth/logout',
        '/api/me',
        '/api/me/password',
        '/api/me/privacy',
        '/api/me/sessions/logout-others',
        '/api/runs',
        '/api/runs/{id}/cancel',
        '/api/sync',
    ]);
});

it('answers 409 account_mismatch and writes nothing but sessions and cache, with the header of another account or without it', function (string $header) {
    $failures = [];
    foreach (protectedModifyingRoutes() as [$method, $path]) {
        $browser = $header === 'missing' ? $this->browser->withoutAccountHeader() : $this->browser->withAccountHeader((string) $this->accountB->id);
        DB::flushQueryLog();
        DB::enableQueryLog();

        $response = $browser->send($method, str_replace(['{user}', '{invitation}'], '1', $path), ['name' => 'Otro', 'password' => 'x', 'privacyVersion' => 'x']);

        if ($response->status() !== 409 || $response->json('code') !== 'account_mismatch') {
            $failures[] = "{$method} {$path} answered {$response->status()}";
        }
        foreach (writesOutsideSessionAndCache() as $write) {
            $failures[] = "{$method} {$path} wrote: {$write}";
        }
    }

    expect($failures)->toBe([])
        ->and($this->accountA->fresh()->name)->toBe('Ana')
        ->and($this->accountB->fresh()->name)->toBe('Beto');
})->with(['the id of another account' => 'other', 'no header' => 'missing']);
