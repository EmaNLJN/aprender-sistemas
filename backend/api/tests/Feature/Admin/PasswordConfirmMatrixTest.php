<?php

use App\Auth\Events\AccountRestricted;
use App\Auth\Invitations;
use App\Auth\Role;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Route;
use Illuminate\Testing\TestResponse;
use Tests\Support\Browser;

/** @return array<string, array{string, string, string, array<string, mixed>}> */
function passwordMatrixRequests(): array
{
    return [
        'PATCH user' => ['PATCH', '/api/admin/users/{student}', 'always', ['role' => 'admin']],
        'DELETE user' => ['DELETE', '/api/admin/users/{student}', 'always', []],
        'POST password-reset' => ['POST', '/api/admin/users/{student}/password-reset', 'always', []],
        'POST export' => ['POST', '/api/me/export', 'always', []],
        'DELETE me' => ['DELETE', '/api/me', 'always', []],
        'POST invitations as admin' => ['POST', '/api/admin/invitations', 'always', ['emails' => ['nuevo@x.com'], 'role' => 'admin', 'delivery' => 'link']],
        'resend of an admin invitation' => ['POST', '/api/admin/invitations/{adminInvitation}/resend', 'always', ['delivery' => 'link']],
        'GET users' => ['GET', '/api/admin/users', 'never', []],
        'GET user' => ['GET', '/api/admin/users/{student}', 'never', []],
        'GET invitations' => ['GET', '/api/admin/invitations', 'never', []],
        'DELETE invitation' => ['DELETE', '/api/admin/invitations/{studentInvitation}', 'never', []],
        'POST invitations as student' => ['POST', '/api/admin/invitations', 'never', ['emails' => ['nuevo@x.com'], 'role' => 'student', 'delivery' => 'link']],
        'resend of a student invitation' => ['POST', '/api/admin/invitations/{studentInvitation}/resend', 'never', ['delivery' => 'link']],
    ];
}

function passwordMatrixSend(Browser $browser, array $request, array $targets): TestResponse
{
    [$method, $path, , $body] = $request;
    $resolved = str_replace(
        ['{student}', '{adminInvitation}', '{studentInvitation}'],
        [(string) $targets['student'], (string) $targets['adminInvitation'], (string) $targets['studentInvitation']],
        $path,
    );

    return $browser->send($method, $resolved, $body);
}

function passwordMatrixConfirm(Browser $browser): void
{
    $browser->post('/api/auth/confirm-password', ['password' => 'password'])->assertCreated();
}

beforeEach(function () {
    useSampleBlockedPasswords();
    Queue::fake();
    Event::fake([AccountRestricted::class]);
    User::factory()->admin()->create();
    $this->admin = User::factory()->admin()->create();
    $student = User::factory()->create();
    $invitations = app(Invitations::class);
    $this->targets = [
        'student' => $student->id,
        'adminInvitation' => $invitations->issue('invitado-admin@x.com', Role::Admin, $this->admin->id)->invitation->id,
        'studentInvitation' => $invitations->issue('invitado-alumno@x.com', Role::Student, $this->admin->id)->invitation->id,
    ];
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->admin);
});

it('covers every admin route and the two routes of the account, so a new one cannot escape the matrix', function () {
    $covered = collect(passwordMatrixRequests())
        ->map(fn (array $request) => $request[0].' '.preg_replace('/\{[^}]+\}/', '{id}', $request[1]))
        ->unique()
        ->sort()
        ->values()
        ->all();
    $routed = collect(Route::getRoutes()->getRoutes())
        ->filter(fn ($route) => str_starts_with($route->uri(), 'api/admin/') || in_array($route->uri(), ['api/me', 'api/me/export'], true))
        ->reject(fn ($route) => $route->uri() === 'api/me' && $route->methods()[0] === 'PATCH')
        ->map(fn ($route) => $route->methods()[0].' /'.preg_replace('/\{[^}]+\}/', '{id}', $route->uri()))
        ->unique()
        ->sort()
        ->values()
        ->all();

    expect($covered)->toBe($routed);
});

it('answers 423 without the reconfirmed password to what always asks for it', function (string $label) {
    $request = passwordMatrixRequests()[$label];

    passwordMatrixSend($this->browser, $request, $this->targets)
        ->assertStatus(423)
        ->assertJsonPath('code', 'password_confirmation_required');
})->with(fn () => collect(passwordMatrixRequests())->filter(fn (array $request) => $request[2] === 'always')->keys()->all());

it('does not answer 423 without the password to what does not ask for it', function (string $label) {
    $request = passwordMatrixRequests()[$label];

    expect(passwordMatrixSend($this->browser, $request, $this->targets)->getStatusCode())->not->toBe(423);
})->with(fn () => collect(passwordMatrixRequests())->filter(fn (array $request) => $request[2] === 'never')->keys()->all());

it('does not answer 423 to anything once the password is confirmed', function (string $label) {
    $request = passwordMatrixRequests()[$label];
    passwordMatrixConfirm($this->browser);

    expect(passwordMatrixSend($this->browser, $request, $this->targets)->getStatusCode())->not->toBe(423);
})->with(fn () => array_keys(passwordMatrixRequests()));

it('answers 423 again to what asks for the password once 901 seconds have passed', function (string $label) {
    $request = passwordMatrixRequests()[$label];
    passwordMatrixConfirm($this->browser);

    $this->travel(901)->seconds();

    passwordMatrixSend($this->browser, $request, $this->targets)
        ->assertStatus(423)
        ->assertJsonPath('code', 'password_confirmation_required');
})->with(fn () => collect(passwordMatrixRequests())->filter(fn (array $request) => $request[2] === 'always')->keys()->all());

it('keeps what does not ask for the password away from 423 after 901 seconds', function (string $label) {
    $request = passwordMatrixRequests()[$label];
    passwordMatrixConfirm($this->browser);

    $this->travel(901)->seconds();

    expect(passwordMatrixSend($this->browser, $request, $this->targets)->getStatusCode())->not->toBe(423);
})->with(fn () => collect(passwordMatrixRequests())->filter(fn (array $request) => $request[2] === 'never')->keys()->all());
