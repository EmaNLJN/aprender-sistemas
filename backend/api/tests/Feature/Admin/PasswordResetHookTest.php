<?php

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;
use Illuminate\Testing\TestResponse;
use Tests\Support\Browser;

function adminRequestReset(Browser $browser, int $id): TestResponse
{
    return $browser->post("/api/admin/users/$id/password-reset");
}

beforeEach(function () {
    $this->admin = User::factory()->admin()->create();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->admin);
    $this->confirmed = function () {
        $this->browser->post('/api/auth/confirm-password', ['password' => 'password'])->assertCreated();

        return $this->browser;
    };
});

it('answers 423 without the reconfirmed password, even for an id that does not exist', function () {
    adminRequestReset($this->browser, User::factory()->create()->id)->assertStatus(423);
    adminRequestReset($this->browser, 999999)->assertStatus(423);
});

it('answers 404 for an id that does not exist once the password is confirmed', function () {
    adminRequestReset(($this->confirmed)(), 999999)->assertStatus(404)->assertJsonPath('code', 'not_found');
});

it('answers 422 with errors.user for an admin target', function () {
    $target = User::factory()->admin()->create();

    adminRequestReset(($this->confirmed)(), $target->id)->assertStatus(422)->assertJsonValidationErrorFor('user', 'errors');
});

it('answers 422, and not 503, for a disabled account or one being deleted', function (string $state) {
    $target = User::factory()->$state()->create();

    adminRequestReset(($this->confirmed)(), $target->id)->assertStatus(422)->assertJsonPath('code', 'validation_failed');
})->with(['disabled', 'deleting']);

it('answers 503 mail_unavailable with Retry-After to an active student', function () {
    $student = User::factory()->create();

    adminRequestReset(($this->confirmed)(), $student->id)
        ->assertStatus(503)
        ->assertHeader('Retry-After', '3600')
        ->assertJsonPath('code', 'mail_unavailable');
});

it('issues no token and queues nothing when it answers 503', function () {
    Queue::fake();
    $student = User::factory()->create();
    $tokensBefore = DB::table('password_reset_tokens')->count();

    adminRequestReset(($this->confirmed)(), $student->id)->assertStatus(503);

    expect(DB::table('password_reset_tokens')->count())->toBe($tokensBefore);
    Queue::assertNothingPushed();
});

it('logs the refusal with the target and a reason, and no email', function () {
    Log::spy();
    $student = User::factory()->create();

    adminRequestReset(($this->confirmed)(), $student->id)->assertStatus(503);

    Log::shouldHaveReceived('info')->withArgs(fn (string $message, array $context = []) => $message === 'admin.password_reset_refused'
        && $context['target_id'] === $student->id
        && $context['reason'] === 'mail_unavailable')->once();
    Log::shouldNotHaveReceived('info', fn (string $message, array $context = []) => str_contains(json_encode($context), $student->email));
});
