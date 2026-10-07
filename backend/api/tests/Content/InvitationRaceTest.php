<?php

use App\Auth\Invitations;
use App\Auth\Role;
use App\Models\User;
use Illuminate\Database\Connection;
use Illuminate\Support\Facades\DB;
use Tests\Support\Browser;

beforeEach(function () {
    useSampleBlockedPasswords();
    $this->issued = app(Invitations::class)->issue('ana@x.com', Role::Student, null);
    $this->browser = Browser::for($this)->useDatabaseDrivers();
    $this->acceptBody = [
        'token' => $this->issued->token,
        'name' => 'Ana Pérez',
        'password' => 'x7Kp2mQ9vL4tZ8w',
        'password_confirmation' => 'x7Kp2mQ9vL4tZ8w',
        'privacyVersion' => config()->string('taller.privacy_version'),
    ];
});

/** Runs `$actor` once, on its own connection, right after the request's first read of `invitations` outside a transaction. */
function actAfterLookup(Closure $actor): stdClass
{
    $run = (object) ['ran' => false];
    DB::listen(function ($query) use ($run, $actor) {
        if ($run->ran || ! str_contains($query->sql, 'from `invitations`') || DB::transactionLevel() > 0) {
            return;
        }
        $run->ran = true;
        $actor(DB::connectUsing('race-actor', config('database.connections.mysql'), true));
    });

    return $run;
}

function insertAccountOn(Connection $connection, string $email): void
{
    $connection->table('users')->insert([
        'name' => 'Ana Pérez',
        'email' => $email,
        'password' => 'not-a-real-hash',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
}

it('answers 404 when another actor completes the acceptance between the lookup and the transaction', function () {
    $race = actAfterLookup(function (Connection $other) {
        insertAccountOn($other, 'ana@x.com');
        $other->table('invitations')->where('email', 'ana@x.com')->delete();
    });

    $this->browser->post('/api/auth/invitations/accept', $this->acceptBody)
        ->assertStatus(404)
        ->assertJson(['code' => 'invitation_not_found']);

    expect($race->ran)->toBeTrue()
        ->and(User::where('email', 'ana@x.com')->count())->toBe(1);
});

it('answers 409 email_taken when another actor creates the account in the middle and keeps the invitation', function () {
    $race = actAfterLookup(fn (Connection $other) => insertAccountOn($other, 'ANA@x.com'));

    $this->browser->post('/api/auth/invitations/accept', $this->acceptBody)
        ->assertStatus(409)
        ->assertJson(['code' => 'email_taken']);

    expect($race->ran)->toBeTrue()
        ->and(User::where('email', 'ana@x.com')->count())->toBe(1)
        ->and(DB::table('invitations')->count())->toBe(1);
});

it('answers 404 to a second acceptance of the same token right after the first', function () {
    $this->browser->post('/api/auth/invitations/accept', $this->acceptBody)->assertCreated();

    $this->browser->post('/api/auth/invitations/accept', $this->acceptBody)
        ->assertStatus(404)
        ->assertJson(['code' => 'invitation_not_found']);

    expect(User::where('email', 'ana@x.com')->count())->toBe(1);
});
