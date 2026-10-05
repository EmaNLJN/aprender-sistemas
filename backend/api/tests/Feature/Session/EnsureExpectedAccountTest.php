<?php

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Session\ProbeRoutes;
use Tests\Support\Browser;

beforeEach(function () {
    ProbeRoutes::register();
    $this->user = User::factory()->create();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->user);
});

it('lets a GET through without the header', function () {
    $this->browser->withoutAccountHeader()->get('/api/probe/account')->assertOk();
});

it('lets a POST through with the id of the account', function () {
    $this->browser->post('/api/probe/account')->assertOk()->assertJson(['id' => $this->user->id]);
});

it('answers 409 account_mismatch to a POST whose header is empty, another id or not a positive integer', function (string $header) {
    $this->browser->withAccountHeader($header)->post('/api/probe/account')
        ->assertStatus(409)
        ->assertExactJson(['message' => 'La sesión cambió de cuenta: recargá la página.', 'code' => 'account_mismatch']);
})->with([
    'empty' => '',
    'another id' => '999999',
    'zero' => '0',
    'negative' => '-1',
    'decimal' => '1.5',
    'padded' => ' 1',
    'text' => 'abc',
]);

it('answers 409 to a POST without the header', function () {
    $this->browser->withoutAccountHeader()->post('/api/probe/account')
        ->assertStatus(409)
        ->assertJsonPath('code', 'account_mismatch');
});

it('does not write anything but session and cache rows before answering 409', function () {
    DB::flushQueryLog();
    DB::enableQueryLog();

    $this->browser->withAccountHeader('999999')->post('/api/probe/account')->assertStatus(409);

    $writes = collect(DB::getQueryLog())
        ->pluck('query')
        ->filter(fn (string $query) => preg_match('/^\s*(insert|update|delete)\b/i', $query) === 1)
        ->reject(fn (string $query) => preg_match('/`?(sessions|cache|cache_locks)`?/i', $query) === 1);

    expect($writes->all())->toBe([]);
});

it('answers 409 to a PUT, PATCH and DELETE with another id, not only to a POST', function (string $method) {
    $this->browser->withAccountHeader('999999')->send($method, '/api/probe/account')->assertStatus(409);
})->with(['PUT', 'PATCH', 'DELETE']);
