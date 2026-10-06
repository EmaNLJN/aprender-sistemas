<?php

use App\Models\User;
use App\Runs\RunLimiters;
use Illuminate\Support\Facades\DB;
use Tests\Support\Browser;
use Tests\Support\RunWorld;

beforeEach(function () {
    RunLimiters::register();
    RunWorld::exercise();
    $this->owner = RunWorld::user();
    $this->run = RunWorld::run($this->owner);
});

/** @return list<array{string, string, array<string, mixed>}> */
function runRoutes(string $runId): array
{
    return [
        ['POST', '/api/runs', ['clientRunId' => '0199f4a2-8e03-7c5a-b3d1-9a77c0de4f21', 'exerciseId' => 'rust-01', 'code' => 'fn main() {}']],
        ['GET', "/api/runs/{$runId}", []],
        ['POST', "/api/runs/{$runId}/cancel", []],
    ];
}

function runRoutesThatModify(string $runId): array
{
    return array_values(array_filter(runRoutes($runId), fn (array $route) => $route[0] === 'POST'));
}

it('answers 401 unauthenticated to every run route without a session', function () {
    $browser = Browser::for($this)->useDatabaseDrivers();

    foreach (runRoutes($this->run->id) as [$method, $path, $body]) {
        $browser->send($method, $path, $body)->assertUnauthorized()->assertJsonPath('code', 'unauthenticated');
    }
    expect(DB::table('runs')->count())->toBe(1);
});

it('answers 404 to the run of another account, also to an admin: no role sees code that is not its own', function (string $role) {
    $actor = $role === 'admin' ? User::factory()->admin()->create() : RunWorld::user();
    $browser = Browser::for($this)->useDatabaseDrivers()->signIn($actor);

    $browser->get("/api/runs/{$this->run->id}")->assertNotFound()->assertJsonPath('code', 'not_found');
    $browser->post("/api/runs/{$this->run->id}/cancel")->assertNotFound()->assertJsonPath('code', 'not_found');

    expect(DB::table('runs')->where('id', $this->run->id)->value('status'))->toBe('queued');
})->with(['student', 'admin']);

it('answers 409 account_mismatch to each route that modifies, with the header of another account or without it', function (string $header) {
    $browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->owner);
    $browser = $header === 'missing' ? $browser->withoutAccountHeader() : $browser->withAccountHeader((string) RunWorld::user()->id);

    foreach (runRoutesThatModify($this->run->id) as [$method, $path, $body]) {
        $browser->send($method, $path, $body)->assertStatus(409)->assertJsonPath('code', 'account_mismatch');
    }
    expect(DB::table('runs')->count())->toBe(1)
        ->and(DB::table('runs')->value('status'))->toBe('queued');
})->with(['another account', 'missing']);

it('answers 419 to each route that modifies without the CSRF token', function () {
    $browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->owner)->enforceCsrf()->forget('XSRF-TOKEN');

    foreach (runRoutesThatModify($this->run->id) as [$method, $path, $body]) {
        $browser->send($method, $path, $body)->assertStatus(419)->assertJsonPath('code', 'csrf_token_mismatch');
    }
    expect(DB::table('runs')->count())->toBe(1);
});

it('answers 403 email_unverified on every run route when the email is not verified', function () {
    $unverified = User::factory()->unverified()->create();
    $browser = Browser::for($this)->useDatabaseDrivers()->signIn($unverified);

    foreach (runRoutes($this->run->id) as [$method, $path, $body]) {
        $browser->send($method, $path, $body)->assertForbidden()->assertJsonPath('code', 'email_unverified');
    }
});

it('answers 403 account_disabled on every run route when the account is disabled', function () {
    foreach (runRoutes($this->run->id) as [$method, $path, $body]) {
        $browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->owner);
        DB::table('users')->where('id', $this->owner->id)->update(['status' => 'disabled']);
        $browser->send($method, $path, $body)->assertForbidden()->assertJsonPath('code', 'account_disabled');
        DB::table('users')->where('id', $this->owner->id)->update(['status' => 'active']);
    }
    expect(DB::table('runs')->where('id', $this->run->id)->value('status'))->toBe('queued');
});

it('has no route for the attempts: they do not exist for a student', function (string $path) {
    $browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->owner);

    $browser->get($path)->assertNotFound();
})->with(['/api/attempts', '/api/attempts/1']);
