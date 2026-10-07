<?php

use App\Auth\AccountStatus;
use App\Auth\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Testing\TestResponse;
use Tests\Support\Browser;

function adminConfirmPasswordOf(Browser $browser): Browser
{
    $browser->post('/api/auth/confirm-password', ['password' => 'password'])->assertCreated();

    return $browser;
}

function adminPatchUser(Browser $browser, int $id, array $body): TestResponse
{
    return $browser->send('PATCH', "/api/admin/users/$id", $body);
}

beforeEach(function () {
    $this->admin = User::factory()->admin()->create();
    $this->other = User::factory()->admin()->create();
    $this->student = User::factory()->create();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->admin);
});

it('answers 423 without the reconfirmed password, even for an id that does not exist', function () {
    adminPatchUser($this->browser, $this->student->id, ['role' => 'admin'])->assertStatus(423)->assertJsonPath('code', 'password_confirmation_required');
    adminPatchUser($this->browser, 999999, ['role' => 'admin'])->assertStatus(423);
    expect($this->student->fresh()->role)->toBe(Role::Student);
});

it('answers 404 not_found for an id that does not exist once the password is confirmed', function () {
    adminPatchUser(adminConfirmPasswordOf($this->browser), 999999, ['status' => 'disabled'])->assertStatus(404)->assertJsonPath('code', 'not_found');
});

it('answers 422 with a sentence when the body asks for nothing', function () {
    $response = adminPatchUser(adminConfirmPasswordOf($this->browser), $this->student->id, [])->assertStatus(422);

    expect($response->json('code'))->toBe('validation_failed')
        ->and($response->json('errors.role'))->toBe(['Indicá el rol o el estado.']);
});

it('answers 422 for a field that is not allowed to change on its own', function () {
    adminPatchUser(adminConfirmPasswordOf($this->browser), $this->student->id, ['email' => 'otra@x.com'])->assertStatus(422);
});

it('answers 422 for a status that is not allowed and for an unknown role', function (array $body, string $field) {
    adminPatchUser(adminConfirmPasswordOf($this->browser), $this->student->id, $body)
        ->assertStatus(422)
        ->assertJsonValidationErrorFor($field, 'errors');
})->with([
    'deleting' => [['status' => 'deleting'], 'status'],
    'root' => [['role' => 'root'], 'role'],
]);

it('answers 422 when an admin disables or demotes themselves', function (array $body, string $field) {
    adminPatchUser(adminConfirmPasswordOf($this->browser), $this->admin->id, $body)
        ->assertStatus(422)
        ->assertJsonValidationErrorFor($field, 'errors');

    expect($this->admin->fresh()->role)->toBe(Role::Admin)
        ->and($this->admin->fresh()->status)->toBe(AccountStatus::Active);
})->with([
    'disable' => [['status' => 'disabled'], 'status'],
    'demote' => [['role' => 'student'], 'role'],
]);

it('answers 422 when the target is being deleted', function () {
    $deleting = User::factory()->deleting()->create();

    adminPatchUser(adminConfirmPasswordOf($this->browser), $deleting->id, ['status' => 'disabled'])
        ->assertStatus(422)
        ->assertJsonValidationErrorFor('status', 'errors');
});

it('changes only the role when the body also carries an email, a name and a user_id', function () {
    $response = adminPatchUser(adminConfirmPasswordOf($this->browser), $this->other->id, ['role' => 'student', 'email' => 'otra@x.com', 'name' => 'X', 'user_id' => 99])->assertOk();

    $fresh = $this->other->fresh();
    expect($fresh->role)->toBe(Role::Student)
        ->and($fresh->email)->toBe($this->other->email)
        ->and($fresh->name)->toBe($this->other->name)
        ->and($fresh->id)->toBe($this->other->id)
        ->and($response->json('data.id'))->toBe($this->other->id)
        ->and($response->json('data.role'))->toBe('student')
        ->and(array_keys($response->json('data')))->toBe(['id', 'name', 'email', 'role', 'status', 'emailVerified', 'privacyVersion', 'createdAt', 'updatedAt']);
});

it('answers 200 when the account already has what is asked', function () {
    adminPatchUser(adminConfirmPasswordOf($this->browser), $this->student->id, ['role' => 'student', 'status' => 'active'])
        ->assertOk()
        ->assertJsonPath('data.role', 'student')
        ->assertJsonPath('data.status', 'active');
});

it('shows a disabled account its 403 account_disabled on the next request and drops its recovery token', function () {
    DB::table('password_reset_tokens')->insert(['email' => $this->student->email, 'token' => 'hashed', 'created_at' => now()]);
    $studentBrowser = Browser::for($this)->signIn($this->student);

    adminPatchUser(adminConfirmPasswordOf($this->browser), $this->student->id, ['status' => 'disabled'])->assertOk()->assertJsonPath('data.status', 'disabled');

    $studentBrowser->get('/api/auth/confirmed-password-status')->assertStatus(403)->assertJsonPath('code', 'account_disabled');
    expect(DB::table('password_reset_tokens')->where('email', $this->student->email)->count())->toBe(0);
});

it('lets a promoted student into the administration and rotates their remember token', function () {
    $studentBrowser = Browser::for($this)->signIn($this->student);
    $studentBrowser->get('/api/admin/users')->assertStatus(403);
    $tokenBefore = $this->student->fresh()->remember_token;

    adminPatchUser(adminConfirmPasswordOf($this->browser), $this->student->id, ['role' => 'admin'])->assertOk();

    $studentBrowser->get('/api/admin/users')->assertOk();
    expect($this->student->fresh()->remember_token)->not->toBe($tokenBefore);
});

it('answers 403 forbidden to a demoted admin on their next request', function () {
    $otherBrowser = Browser::for($this)->signIn($this->other);
    $otherBrowser->get('/api/admin/users')->assertOk();

    adminPatchUser(adminConfirmPasswordOf($this->browser), $this->other->id, ['role' => 'student'])->assertOk();

    $otherBrowser->get('/api/admin/users')->assertStatus(403)->assertJsonPath('code', 'forbidden');
});

it('logs the change with the target and the roles and states, and no email', function () {
    Log::spy();

    adminPatchUser(adminConfirmPasswordOf($this->browser), $this->student->id, ['status' => 'disabled'])->assertOk();

    Log::shouldHaveReceived('info')->withArgs(fn (string $message, array $context = []) => $message === 'admin.account_changed'
        && $context['target_id'] === $this->student->id
        && $context['from'] === ['role' => 'student', 'status' => 'active']
        && $context['to'] === ['role' => 'student', 'status' => 'disabled'])->once();
    Log::shouldNotHaveReceived('info', fn (string $message, array $context = []) => str_contains(json_encode($context), $this->student->email));
});

it('does not log a request that changed nothing', function () {
    Log::spy();

    adminPatchUser(adminConfirmPasswordOf($this->browser), $this->student->id, ['role' => 'student'])->assertOk();

    Log::shouldNotHaveReceived('info', fn (string $message, array $context = []) => $message === 'admin.account_changed');
});
