<?php

use App\Auth\Events\AccountRestricted;
use App\Auth\Invitations;
use App\Auth\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Route;
use Illuminate\Testing\TestResponse;
use Tests\Support\Browser;
use Tests\Support\PopulatedAccount;

const STUDENT_TEXT_KEYS = ['code', 'reflection', 'note', 'body', 'custom_test', 'raw_payload'];

const STUDENT_TEXT_ROUTES_WITHOUT_SUCCESS = ['POST /api/admin/users/{user}/password-reset'];

/** @return list<string> the dotted paths where a key that carries text of a student appears, at any depth */
function studentTextPathsIn(mixed $value, string $path = ''): array
{
    if (! is_array($value)) {
        return [];
    }
    $found = [];
    foreach ($value as $key => $child) {
        $childPath = $path === '' ? (string) $key : "{$path}.{$key}";
        if (in_array($key, STUDENT_TEXT_KEYS, true)) {
            $found[] = $childPath;
        }
        $found = [...$found, ...studentTextPathsIn($child, $childPath)];
    }

    return $found;
}

/** @return list<string> */
function studentTextAdminRoutes(): array
{
    return collect(Route::getRoutes()->getRoutes())
        ->filter(fn ($route) => str_starts_with($route->uri(), 'api/admin/'))
        ->map(fn ($route) => $route->methods()[0].' /'.$route->uri())
        ->values()
        ->all();
}

/**
 * @param  array<string, int>  $targets
 * @return array<string, array{string, array<string, mixed>}> the request that succeeds for each route of the matrix
 */
function studentTextScenarios(array $targets): array
{
    return [
        'GET /api/admin/users' => ['/api/admin/users', []],
        'GET /api/admin/users/{user}' => ["/api/admin/users/{$targets['student']}", []],
        'PATCH /api/admin/users/{user}' => ["/api/admin/users/{$targets['student']}", ['status' => 'disabled']],
        'GET /api/admin/invitations' => ['/api/admin/invitations', []],
        'POST /api/admin/invitations' => ['/api/admin/invitations', ['emails' => ['nuevo@x.com'], 'role' => 'student', 'delivery' => 'link']],
        'POST /api/admin/invitations/{invitation}/resend' => ["/api/admin/invitations/{$targets['resent']}/resend", ['delivery' => 'link']],
        'DELETE /api/admin/invitations/{invitation}' => ["/api/admin/invitations/{$targets['revoked']}", []],
        'DELETE /api/admin/users/{user}' => ["/api/admin/users/{$targets['doomed']}", []],
    ];
}

/**
 * @param  array<string, int>  $targets
 * @return array<string, TestResponse|string> a response for each route, or the reason the route was not walked
 */
function studentTextWalk(Browser $browser, array $targets): array
{
    $scenarios = studentTextScenarios($targets);
    $walked = [];
    foreach (studentTextAdminRoutes() as $label) {
        if (in_array($label, STUDENT_TEXT_ROUTES_WITHOUT_SUCCESS, true)) {
            continue;
        }
        [$method, $path] = explode(' ', $label);
        if (isset($scenarios[$label])) {
            $walked[$label] = $browser->send($method, $scenarios[$label][0], $scenarios[$label][1]);
        } elseif ($method === 'GET' && ! str_contains($path, '{')) {
            $walked[$label] = $browser->get($path);
        } else {
            $walked[$label] = 'no scenario for the route';
        }
    }

    return $walked;
}

/** @param array<string, TestResponse|string> $walked */
function studentTextProblemsIn(array $walked): array
{
    $problems = [];
    foreach ($walked as $label => $response) {
        if (is_string($response)) {
            $problems[] = "{$label}: {$response}";

            continue;
        }
        if ($response->getStatusCode() < 200 || $response->getStatusCode() >= 300) {
            $problems[] = "{$label}: answered {$response->getStatusCode()}";
        }
        $body = json_decode((string) $response->getContent(), true);
        foreach (studentTextPathsIn($body) as $path) {
            $problems[] = "{$label}: leaks {$path}";
        }
    }

    return $problems;
}

beforeEach(function () {
    useSampleBlockedPasswords();
    Queue::fake();
    Event::fake([AccountRestricted::class]);
    $this->admin = User::factory()->admin()->create();
    $student = PopulatedAccount::create();
    DB::table('exercise_progress')->where('user_id', $student->id)->update(['reflection' => 'mi reflexión privada', 'custom_test' => 'assert!(true)']);
    DB::table('attempt_payloads')->update(['custom_test' => 'assert!(false)', 'stdout' => 'salida privada']);
    $invitations = app(Invitations::class);
    $this->targets = [
        'student' => $student->id,
        'doomed' => PopulatedAccount::create()->id,
        'resent' => $invitations->issue('reenviada@x.com', Role::Student, $this->admin->id)->invitation->id,
        'revoked' => $invitations->issue('revocada@x.com', Role::Student, $this->admin->id)->invitation->id,
    ];
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->admin);
    $this->browser->post('/api/auth/confirm-password', ['password' => 'password'])->assertCreated();
});

it('shows no text of a student at any depth in the successful answer of any admin route', function () {
    $walked = studentTextWalk($this->browser, $this->targets);

    expect(studentTextProblemsIn($walked))->toBe([]);
    foreach ($walked as $response) {
        expect((string) $response->getContent())->not->toContain('mi reflexión privada')->not->toContain('assert!(')->not->toContain('salida privada');
    }
});

it('walks every admin route of the router except the one that cannot succeed until C3c', function () {
    $walked = array_keys(studentTextWalk($this->browser, $this->targets));

    expect($walked)->toHaveCount(8)
        ->and(array_values(array_diff(studentTextAdminRoutes(), $walked)))->toBe(STUDENT_TEXT_ROUTES_WITHOUT_SUCCESS);
});

it('breaks when a new admin route answers 200 with a key that carries student text', function (array $leakingBody, string $leakingPath) {
    Route::middleware(['api', 'admin'])->get('api/admin/probe', fn () => response()->json($leakingBody));
    app('router')->getRoutes()->refreshNameLookups();

    $problems = studentTextProblemsIn(studentTextWalk($this->browser, $this->targets));

    expect($problems)->toBe(["GET /api/admin/probe: leaks {$leakingPath}"]);
})->with([
    'code at the top of data' => [['data' => ['code' => 'fn main() {}']], 'data.code'],
    'a note deep inside a list' => [['data' => [['attempts' => [['note' => 'privada']]]]], 'data.0.attempts.0.note'],
    'a raw payload' => [['data' => ['raw_payload' => '{}']], 'data.raw_payload'],
]);

it('reports a new admin route that modifies and has no scenario instead of skipping it', function () {
    Route::middleware(['api', 'admin'])->post('api/admin/probe', fn () => response()->json(['data' => []]));
    app('router')->getRoutes()->refreshNameLookups();

    expect(studentTextProblemsIn(studentTextWalk($this->browser, $this->targets)))->toBe(['POST /api/admin/probe: no scenario for the route']);
});
