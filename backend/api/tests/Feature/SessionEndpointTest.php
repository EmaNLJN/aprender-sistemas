<?php

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Session\ProbeRoutes;
use Tests\Support\Browser;

beforeEach(function () {
    ProbeRoutes::register();
    $this->browser = Browser::for($this)->useDatabaseDrivers();
});

function insertCatalog(string $code, string $sliceBy, ?int $chainPosition, string $status = 'active'): void
{
    DB::table('catalogs')->insert([
        'code' => $code, 'slice_by' => $sliceBy, 'chain_position' => $chainPosition, 'status' => $status,
        'retired_at' => $status === 'active' ? null : '2026-10-05 12:00:00.000',
        'created_at' => '2026-10-05 12:00:00.000', 'updated_at' => '2026-10-05 12:00:00.000',
    ]);
}

it('answers a guest with no user, the features off, no content version and no catalogs', function () {
    $response = $this->browser->get('/api/session');

    $response->assertOk()->assertExactJson([
        'user' => null,
        'features' => ['passwordReset' => false, 'registration' => false],
        'contentVersion' => null,
        'catalogs' => [],
    ]);
    expect($response->headers->hasCacheControlDirective('no-store'))->toBeTrue()
        ->and($response->json())->not->toHaveKey('appBuild');
});

it('starts the guest session and hands out the CSRF cookie', function () {
    $response = $this->browser->get('/api/session');

    expect($this->browser->cookie('XSRF-TOKEN'))->not->toBeNull()
        ->and($this->browser->cookie('taller-session'))->not->toBeNull()
        ->and(DB::table('sessions')->count())->toBe(1)
        ->and(DB::table('sessions')->value('user_id'))->toBeNull();
});

it('takes the features from the configuration', function () {
    config(['taller.features' => ['password_reset' => true, 'registration' => false]]);

    $this->browser->get('/api/session')->assertJsonPath('features', ['passwordReset' => true, 'registration' => false]);
});

it('lists the active catalogs with a chain position first, by position, and then the rest by code', function () {
    insertCatalog('late', 'language', 2);
    insertCatalog('early', 'language', 1);
    insertCatalog('zeta', 'domain', null);
    insertCatalog('alfa', 'domain', null);
    insertCatalog('old', 'language', null, status: 'deprecated');

    $this->browser->get('/api/session')->assertJsonPath('catalogs', [
        ['code' => 'early', 'sliceBy' => 'language', 'chainPosition' => 1],
        ['code' => 'late', 'sliceBy' => 'language', 'chainPosition' => 2],
        ['code' => 'alfa', 'sliceBy' => 'domain', 'chainPosition' => null],
        ['code' => 'zeta', 'sliceBy' => 'domain', 'chainPosition' => null],
    ]);
});

it('answers a signed in account with the five keys of the user', function () {
    $user = User::factory()->create(['name' => 'Ana', 'email' => 'ana@x.com']);
    $this->browser->signIn($user);

    $this->browser->get('/api/session')->assertOk()->assertJsonPath('user', [
        'id' => $user->id, 'name' => 'Ana', 'email' => 'ana@x.com', 'role' => 'student', 'privacyAccepted' => false,
    ]);
});

it('reports the privacy notice as accepted only for the current version', function () {
    $user = User::factory()->create(['privacy_version' => config('taller.privacy_version'), 'privacy_accepted_at' => now()]);
    $stale = User::factory()->create(['privacy_version' => 'an-older-notice', 'privacy_accepted_at' => now()]);

    $this->browser->signIn($user);
    $this->browser->get('/api/session')->assertJsonPath('user.privacyAccepted', true);

    $other = Browser::for($this)->useDatabaseDrivers()->signIn($stale);
    $other->get('/api/session')->assertJsonPath('user.privacyAccepted', false);
});

describe('an invalid session', function () {
    it('answers a disabled account with no user and the session stops serving', function () {
        $user = User::factory()->create();
        $this->browser->signIn($user);
        $user->forceFill(['status' => 'disabled'])->save();

        $this->browser->get('/api/session')->assertOk()->assertJsonPath('user', null);
        $this->browser->get('/api/probe/account')->assertStatus(401);
    });

    it('answers an account whose password changed in another session with no user', function () {
        $user = User::factory()->create();
        $this->browser->signIn($user);
        $this->browser->get('/api/probe/public')->assertJson(['id' => $user->id]);
        $user->forceFill(['password' => 'a new password for the account'])->save();

        $this->browser->get('/api/session')->assertOk()->assertJsonPath('user', null);
        $this->browser->get('/api/probe/account')->assertStatus(401);
    });

    it('answers a session of more than eight hours with no user', function () {
        Carbon::setTestNow(Carbon::now());
        $user = User::factory()->create();
        $this->browser->signIn($user);

        foreach (range(1, 19) as $ignored) {
            $this->travel(25)->minutes();
            $this->browser->get('/api/probe/account')->assertOk();
        }
        $this->travel(6)->minutes();

        $this->browser->get('/api/session')->assertOk()->assertJsonPath('user', null);
        $this->browser->get('/api/probe/account')->assertStatus(401);
        Carbon::setTestNow();
    });
});
