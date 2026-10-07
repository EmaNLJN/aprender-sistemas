<?php

use App\Http\ProgressLimiters;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Tests\Feature\Session\ProbeRoutes;
use Tests\Support\Browser;
use Tests\Support\ProgressWorld;

const RESET_ROUTE_ENDPOINT = '/api/progress/reset';

function resetRouteConfirmPassword(Browser $browser): void
{
    $browser->post('/api/probe/mark-confirmed')->assertNoContent();
}

function resetRouteSignedIn(User $user, bool $confirmed = true): Browser
{
    $browser = Browser::for(test())->useDatabaseDrivers()->signIn($user);
    if ($confirmed) {
        resetRouteConfirmPassword($browser);
    }

    return $browser;
}

/** @return array<string, mixed> */
function resetRouteBody(int $epoch = 1): array
{
    return ['format' => 2, 'epoch' => $epoch];
}

beforeEach(function () {
    ProgressLimiters::register();
    ProbeRoutes::register();
    Route::prefix('api')->middleware('api')->group(base_path('routes/api/progress-reset.php'));
    $this->user = ProgressWorld::user();
    ProgressWorld::head($this->user, epoch: 1, revision: 7);
});

describe('the access', function () {
    it('answers 401 without a session', function () {
        Browser::for($this)->useDatabaseDrivers()->post(RESET_ROUTE_ENDPOINT, resetRouteBody())->assertStatus(401);

        expect(DB::table('progress_heads')->where('user_id', $this->user->id)->value('epoch'))->toBe(1);
    });

    it('answers 409 account_mismatch without X-Taller-User', function () {
        $browser = resetRouteSignedIn($this->user)->withoutAccountHeader();

        $browser->post(RESET_ROUTE_ENDPOINT, resetRouteBody())->assertStatus(409)->assertJsonPath('code', 'account_mismatch');

        expect(DB::table('progress_heads')->where('user_id', $this->user->id)->value('epoch'))->toBe(1);
    });

    it('answers 423 password_confirmation_required when the password was not confirmed, and writes nothing', function () {
        $browser = resetRouteSignedIn($this->user, confirmed: false);

        $browser->post(RESET_ROUTE_ENDPOINT, resetRouteBody())->assertStatus(423)->assertJsonPath('code', 'password_confirmation_required');

        expect(DB::table('progress_heads')->where('user_id', $this->user->id)->value('epoch'))->toBe(1);
    });

    it('does not spend the daily limit on four 423 in a row', function () {
        $browser = resetRouteSignedIn($this->user, confirmed: false);
        foreach (range(1, 4) as $ignored) {
            $browser->post(RESET_ROUTE_ENDPOINT, resetRouteBody())->assertStatus(423);
        }
        resetRouteConfirmPassword($browser);

        $browser->post(RESET_ROUTE_ENDPOINT, resetRouteBody())->assertOk();
    });
});

describe('the errors', function () {
    it('answers 422 validation_failed for an envelope that is not valid', function (array $body, string $field) {
        $response = resetRouteSignedIn($this->user)->post(RESET_ROUTE_ENDPOINT, $body);

        $response->assertStatus(422)->assertJsonPath('code', 'validation_failed')->assertJsonStructure(['errors' => [$field]]);
        expect(DB::table('progress_heads')->where('user_id', $this->user->id)->value('epoch'))->toBe(1);
    })->with([
        'no epoch' => [['format' => 2], 'epoch'],
        'epoch 0' => [['format' => 2, 'epoch' => 0], 'epoch'],
        'epoch as text' => [['format' => 2, 'epoch' => '1'], 'epoch'],
        'no format' => [['epoch' => 1], 'format'],
        'format as text' => [['format' => '2', 'epoch' => 1], 'format'],
    ]);

    it('answers 409 client_outdated for a format the server does not accept', function () {
        resetRouteSignedIn($this->user)->post(RESET_ROUTE_ENDPOINT, ['format' => 1, 'epoch' => 1])->assertStatus(409)->assertJsonPath('code', 'client_outdated');

        expect(DB::table('progress_heads')->where('user_id', $this->user->id)->value('epoch'))->toBe(1);
    });

    it('answers 409 epoch_mismatch with the current epoch and revision', function () {
        $response = resetRouteSignedIn($this->user)->post(RESET_ROUTE_ENDPOINT, resetRouteBody(epoch: 2));

        $response->assertStatus(409)->assertJsonPath('code', 'epoch_mismatch')->assertJsonPath('epoch', 1)->assertJsonPath('revision', 7);
        expect($response->headers->getCacheControlDirective('no-store'))->toBeTrue();
    });
});

describe('the response', function () {
    it('answers 200 with exactly the epoch and the revision, and is not stored', function () {
        $response = resetRouteSignedIn($this->user)->post(RESET_ROUTE_ENDPOINT, resetRouteBody());

        $response->assertOk()->assertExactJson(['epoch' => 2, 'revision' => 8]);
        expect($response->headers->getCacheControlDirective('no-store'))->toBeTrue()
            ->and($response->headers->getCacheControlDirective('private'))->toBeTrue();
    });

    it('ignores a user_id in the body and resets the account of the session', function () {
        $other = ProgressWorld::user();
        ProgressWorld::head($other, epoch: 1, revision: 3);

        resetRouteSignedIn($this->user)->post(RESET_ROUTE_ENDPOINT, [...resetRouteBody(), 'user_id' => $other->id])->assertOk();

        expect(DB::table('progress_heads')->where('user_id', $other->id)->value('epoch'))->toBe(1)
            ->and(DB::table('progress_heads')->where('user_id', $this->user->id)->value('epoch'))->toBe(2);
    });
});

describe('who can reset', function () {
    it('lets an account with an unverified email reset', function () {
        $unverified = ProgressWorld::user(['email_verified_at' => null]);
        ProgressWorld::head($unverified);

        resetRouteSignedIn($unverified)->post(RESET_ROUTE_ENDPOINT, resetRouteBody())->assertOk()->assertJsonPath('epoch', 2);
    });

    it('lets an admin reset the progress of its own account', function () {
        $admin = User::factory()->admin()->create();
        ProgressWorld::head($admin);

        resetRouteSignedIn($admin)->post(RESET_ROUTE_ENDPOINT, resetRouteBody())->assertOk()->assertJsonPath('epoch', 2);
    });
});

describe('the limit', function () {
    it('answers 429 with Retry-After to the fourth reset of the day', function () {
        $browser = resetRouteSignedIn($this->user);
        foreach ([1, 2, 3] as $epoch) {
            $browser->post(RESET_ROUTE_ENDPOINT, resetRouteBody($epoch))->assertOk();
        }

        $response = $browser->post(RESET_ROUTE_ENDPOINT, resetRouteBody(4));

        $response->assertStatus(429)->assertJsonPath('code', 'too_many_requests');
        expect((int) $response->headers->get('Retry-After'))->toBeBetween(1, 86400)
            ->and(DB::table('progress_heads')->where('user_id', $this->user->id)->value('epoch'))->toBe(4);
    });

    it('keeps the limit of one account apart from the limit of another', function () {
        $other = ProgressWorld::user();
        ProgressWorld::head($other);
        $browser = resetRouteSignedIn($this->user);
        foreach ([1, 2, 3] as $epoch) {
            $browser->post(RESET_ROUTE_ENDPOINT, resetRouteBody($epoch))->assertOk();
        }

        resetRouteSignedIn($other)->post(RESET_ROUTE_ENDPOINT, resetRouteBody())->assertOk();
    });
});
