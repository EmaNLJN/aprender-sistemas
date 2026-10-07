<?php

use App\Auth\AccountStatus;
use App\Auth\Role;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Routing\Route as RoutingRoute;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Testing\TestResponse;
use Tests\Support\Browser;

const ADMIN_MATRIX_MISSING_ID = 999999;

/** @return list<array{string, string}> */
function adminMatrixRoutes(): array
{
    $routes = [];
    foreach (Route::getRoutes()->getRoutes() as $route) {
        if (str_starts_with($route->uri(), 'api/admin/')) {
            $routes[] = [adminMatrixMethodOf($route), '/'.$route->uri()];
        }
    }

    return $routes;
}

function adminMatrixMethodOf(RoutingRoute $route): string
{
    return $route->methods()[0];
}

function adminMatrixModifies(string $method): bool
{
    return $method !== 'GET';
}

/** @param array{user: int|string, invitation: int|string} $targets */
function adminMatrixPath(string $path, array $targets): string
{
    return str_replace(['{user}', '{invitation}'], [(string) $targets['user'], (string) $targets['invitation']], $path);
}

/** @param array{user: int|string, invitation: int|string} $targets */
function adminMatrixSend(Browser $browser, string $method, string $path, array $targets): TestResponse
{
    return $browser->send($method, adminMatrixPath($path, $targets), ['name' => 'Otro', 'password' => 'x']);
}

/** @return list<string> */
function adminMatrixWritesOutsideSessionAndCache(): array
{
    return collect(DB::getQueryLog())
        ->pluck('query')
        ->filter(fn (string $query) => preg_match('/^\s*(insert|update|delete|replace|truncate)\b/i', $query) === 1)
        ->reject(fn (string $query) => preg_match('/`(sessions|cache|cache_locks)`/i', $query) === 1)
        ->values()
        ->all();
}

/** @param Closure(string, string, array{user: int|string, invitation: int|string}): TestResponse $send */
function adminMatrixCollectFailures(Closure $send, int $expectedStatus, string $expectedCode, User $student, Invitation $invitation, bool $onlyModifying = false): array
{
    $failures = [];
    foreach (adminMatrixRoutes() as [$method, $path]) {
        if ($onlyModifying && ! adminMatrixModifies($method)) {
            continue;
        }
        foreach ([['user' => $student->id, 'invitation' => $invitation->id], ['user' => ADMIN_MATRIX_MISSING_ID, 'invitation' => ADMIN_MATRIX_MISSING_ID]] as $targets) {
            $response = $send($method, $path, $targets);
            if ($response->status() !== $expectedStatus || $response->json('code') !== $expectedCode) {
                $failures[] = "{$method} ".adminMatrixPath($path, $targets)." answered {$response->status()} {$response->json('code')}";
            }
        }
    }

    return $failures;
}

beforeEach(function () {
    $this->admin = User::factory()->admin()->create();
    $this->student = User::factory()->create();
    Invitation::unguard();
    $this->invitation = Invitation::create([
        'email' => 'invited@example.test', 'role' => 'student', 'delivery' => 'link', 'token_hash' => hash('sha256', 'token'),
        'invited_by' => $this->admin->id, 'expires_at' => now()->addDays(7),
    ]);
    Invitation::reguard();
});

it('covers exactly the nine routes under /api/admin', function () {
    expect(collect(adminMatrixRoutes())->map(fn (array $route) => "{$route[0]} {$route[1]}")->sort()->values()->all())->toBe([
        'DELETE /api/admin/invitations/{invitation}',
        'DELETE /api/admin/users/{user}',
        'GET /api/admin/invitations',
        'GET /api/admin/users',
        'GET /api/admin/users/{user}',
        'PATCH /api/admin/users/{user}',
        'POST /api/admin/invitations',
        'POST /api/admin/invitations/{invitation}/resend',
        'POST /api/admin/users/{user}/password-reset',
    ]);
});

it('answers 401 unauthenticated to every admin route without a session, with an existing id and with one that does not', function () {
    $anonymous = Browser::for($this)->useDatabaseDrivers();

    $failures = adminMatrixCollectFailures(
        fn (string $method, string $path, array $targets) => adminMatrixSend($anonymous, $method, $path, $targets),
        401,
        'unauthenticated',
        $this->student,
        $this->invitation,
    );

    expect($failures)->toBe([]);
});

it('answers 403 forbidden to a verified student, whether the target exists or not', function () {
    $browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->student);

    $failures = adminMatrixCollectFailures(
        fn (string $method, string $path, array $targets) => adminMatrixSend($browser, $method, $path, $targets),
        403,
        'forbidden',
        $this->student,
        $this->invitation,
    );

    expect($failures)->toBe([]);
});

it('answers 403 email_unverified to a student whose email is not verified', function () {
    $browser = Browser::for($this)->useDatabaseDrivers()->signIn(User::factory()->unverified()->create());

    $failures = adminMatrixCollectFailures(
        fn (string $method, string $path, array $targets) => adminMatrixSend($browser, $method, $path, $targets),
        403,
        'email_unverified',
        $this->student,
        $this->invitation,
    );

    expect($failures)->toBe([]);
});

it('answers 403 account_disabled to a disabled account whose session is still alive, on its first request', function () {
    $failures = adminMatrixCollectFailures(function (string $method, string $path, array $targets) {
        $disabledAdmin = User::factory()->admin()->create();
        $browser = Browser::for($this)->useDatabaseDrivers()->signIn($disabledAdmin);
        $disabledAdmin->forceFill(['status' => AccountStatus::Disabled])->save();

        return adminMatrixSend($browser, $method, $path, $targets);
    }, 403, 'account_disabled', $this->student, $this->invitation);

    expect($failures)->toBe([]);
});

it('answers 409 account_mismatch to an admin that modifies with the header of another account or without it, and writes nothing but sessions and cache', function (string $header) {
    $signedIn = Browser::for($this)->useDatabaseDrivers()->signIn($this->admin);
    $browser = $header === 'missing' ? $signedIn->withoutAccountHeader() : $signedIn->withAccountHeader((string) $this->student->id);
    $writes = [];
    $usersBefore = User::count();
    $invitationsBefore = Invitation::count();

    $failures = adminMatrixCollectFailures(function (string $method, string $path, array $targets) use ($browser, &$writes) {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $response = adminMatrixSend($browser, $method, $path, $targets);
        foreach (adminMatrixWritesOutsideSessionAndCache() as $write) {
            $writes[] = "{$method} {$path} wrote: {$write}";
        }

        return $response;
    }, 409, 'account_mismatch', $this->student, $this->invitation, onlyModifying: true);

    expect($failures)->toBe([])
        ->and($writes)->toBe([])
        ->and(User::count())->toBe($usersBefore)
        ->and($this->admin->fresh()->role)->toBe(Role::Admin)
        ->and($this->student->fresh()->role)->toBe(Role::Student)
        ->and(Invitation::count())->toBe($invitationsBefore);
})->with(['the id of another account' => 'other', 'no header' => 'missing']);

it('answers 404 not_found for every admin route with a target that is not an integer, whoever asks', function (string $who) {
    $browser = Browser::for($this)->useDatabaseDrivers();
    if ($who === 'student') {
        $browser->signIn($this->student);
    }
    if ($who === 'admin') {
        $browser->signIn($this->admin);
    }

    $failures = [];
    foreach (adminMatrixRoutes() as [$method, $path]) {
        if (! str_contains($path, '{')) {
            continue;
        }
        $response = adminMatrixSend($browser, $method, $path, ['user' => 'abc', 'invitation' => 'abc']);
        if ($response->status() !== 404 || $response->json('code') !== 'not_found') {
            $failures[] = "{$method} ".adminMatrixPath($path, ['user' => 'abc', 'invitation' => 'abc'])." answered {$response->status()} {$response->json('code')}";
        }
    }

    expect($failures)->toBe([]);
})->with(['nobody' => 'nobody', 'a student' => 'student', 'an admin' => 'admin']);

it('answers 409 account_mismatch to POST /api/me/export and DELETE /api/me when the session is of one account and the header of another', function (string $method, string $path) {
    $other = User::factory()->create();
    $browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->student)->withAccountHeader((string) $other->id);

    DB::flushQueryLog();
    DB::enableQueryLog();
    $response = $browser->send($method, $path);

    $response->assertStatus(409)->assertJsonPath('code', 'account_mismatch');
    expect(adminMatrixWritesOutsideSessionAndCache())->toBe([])
        ->and($this->student->fresh()->status)->toBe(AccountStatus::Active);
})->with([
    'export' => ['POST', '/api/me/export'],
    'deletion' => ['DELETE', '/api/me'],
]);
