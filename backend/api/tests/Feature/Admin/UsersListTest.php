<?php

use App\Models\User;
use Illuminate\Testing\TestResponse;
use Tests\Support\Browser;

function directoryOfSeven(): User
{
    $accounts = [
        ['Ana Pérez', 'ana@x.com', 'student', 'active'],
        ['Beto Ruiz', 'beto@x.com', 'student', 'disabled'],
        ['Carla Gómez', 'carla@x.com', 'admin', 'active'],
        ['Diego Ana', 'diego@y.com', 'student', 'active'],
        ['Eva Lúa', 'eva@z.com', 'student', 'deleting'],
        ['Fede Mora', 'fede@x.com', 'admin', 'disabled'],
    ];
    foreach ($accounts as [$name, $email, $role, $status]) {
        User::factory()->create(['name' => $name, 'email' => $email, 'role' => $role, 'status' => $status]);
    }
    User::factory()->unverified()->create(['name' => 'Gala Sosa', 'email' => 'gala@x.com']);

    return User::where('email', 'carla@x.com')->firstOrFail();
}

function namesIn(TestResponse $response): array
{
    return collect($response->json('data'))->pluck('name')->all();
}

beforeEach(function () {
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn(directoryOfSeven());
});

it('returns the second page of three with its meta', function () {
    $response = $this->browser->get('/api/admin/users?perPage=3&page=2')->assertOk();

    expect(namesIn($response))->toBe(['Diego Ana', 'Eva Lúa', 'Fede Mora'])
        ->and($response->json('meta'))->toBe(['page' => 2, 'perPage' => 3, 'total' => 7, 'lastPage' => 3]);
});

it('returns an empty list past the last page with the same lastPage', function () {
    $response = $this->browser->get('/api/admin/users?perPage=3&page=4')->assertOk();

    expect($response->json('data'))->toBe([])
        ->and($response->json('meta.lastPage'))->toBe(3);
});

it('defaults to 25 per page', function () {
    $this->browser->get('/api/admin/users')->assertOk()->assertJsonPath('meta.perPage', 25);
});

it('rejects a perPage out of 1 to 100', function (string $query) {
    $this->browser->get("/api/admin/users?$query")->assertStatus(422)->assertJsonPath('code', 'validation_failed')->assertJsonValidationErrorFor('perPage', 'errors');
})->with(['perPage=101', 'perPage=0']);

it('searches the name and the email as a substring', function (string $q, array $names) {
    expect(namesIn($this->browser->get('/api/admin/users?q='.urlencode($q))->assertOk()))->toBe($names);
})->with([
    'name' => ['ana', ['Ana Pérez', 'Diego Ana']],
    'accent and case in the name' => ['PÉREZ', ['Ana Pérez']],
    'no accent in the name' => ['perez', ['Ana Pérez']],
    'email' => ['y.com', ['Diego Ana']],
    'percent is literal' => ['%', []],
    'underscore is literal' => ['_', []],
]);

it('filters by role and status together', function () {
    expect(namesIn($this->browser->get('/api/admin/users?role=admin&status=active')->assertOk()))->toBe(['Carla Gómez']);
});

it('filters by the deleting status', function () {
    expect(namesIn($this->browser->get('/api/admin/users?status=deleting')->assertOk()))->toBe(['Eva Lúa']);
});

it('sorts by name ascending, descending and by email', function (string $sort, array $names) {
    expect(namesIn($this->browser->get('/api/admin/users?sort='.$sort)->assertOk()))->toBe($names);
})->with([
    'name' => ['name', ['Ana Pérez', 'Beto Ruiz', 'Carla Gómez', 'Diego Ana', 'Eva Lúa', 'Fede Mora', 'Gala Sosa']],
    '-name' => ['-name', ['Gala Sosa', 'Fede Mora', 'Eva Lúa', 'Diego Ana', 'Carla Gómez', 'Beto Ruiz', 'Ana Pérez']],
    'email' => ['email', ['Ana Pérez', 'Beto Ruiz', 'Carla Gómez', 'Diego Ana', 'Eva Lúa', 'Fede Mora', 'Gala Sosa']],
]);

it('sorts by email, not by name', function () {
    User::query()->where('email', 'ana@x.com')->update(['email' => 'zzz@x.com']);

    expect(namesIn($this->browser->get('/api/admin/users?sort=email')->assertOk()))->toBe(['Beto Ruiz', 'Carla Gómez', 'Diego Ana', 'Eva Lúa', 'Fede Mora', 'Gala Sosa', 'Ana Pérez']);
});

it('rejects an invalid sort with errors.sort', function () {
    $this->browser->get('/api/admin/users?sort=password')->assertStatus(422)->assertJsonValidationErrorFor('sort', 'errors');
});

it('answers 403 to a student and 401 without a session', function () {
    Browser::for($this)->useDatabaseDrivers()->signIn(User::where('email', 'ana@x.com')->firstOrFail())->get('/api/admin/users')->assertStatus(403);
    Browser::for($this)->useDatabaseDrivers()->get('/api/admin/users')->assertStatus(401);
});
