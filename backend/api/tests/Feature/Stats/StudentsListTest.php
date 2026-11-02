<?php

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Tests\Support\Browser;
use Tests\Support\StatsWorld;

beforeEach(function () {
    $this->travelTo(CarbonImmutable::parse(StatsWorld::NOW, 'UTC'));
    $this->ids = StatsWorld::create();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn(User::findOrFail($this->ids['admin']));
});

function studentNamesIn(array $rows): array
{
    return array_column($rows, 'name');
}

it('lists the students of the population with their usage, counted by hand', function () {
    $response = $this->browser->get('/api/admin/stats/students')->assertOk();

    expect($response->json('data'))->toBe([
        ['id' => $this->ids['ana'], 'name' => 'Ana Pérez', 'email' => 'ana@stats.test', 'role' => 'student', 'status' => 'active',
            'lastActivityAt' => '2026-10-20T10:00:00.000Z', 'solved' => ['server' => 1, 'imported' => 0], 'attempts' => ['lastWeek' => 0, 'lastMonth' => 3], 'lastAttemptAt' => '2026-10-06T02:30:00.000Z'],
        ['id' => $this->ids['beto'], 'name' => 'Beto Ruiz', 'email' => 'beto@stats.test', 'role' => 'student', 'status' => 'active',
            'lastActivityAt' => '2026-10-15T12:00:00.000Z', 'solved' => ['server' => 1, 'imported' => 1], 'attempts' => ['lastWeek' => 0, 'lastMonth' => 1], 'lastAttemptAt' => '2026-10-12T14:00:00.000Z'],
        ['id' => $this->ids['caro'], 'name' => 'Caro Díaz', 'email' => 'caro@stats.test', 'role' => 'student', 'status' => 'disabled',
            'lastActivityAt' => '2026-09-01T12:00:00.000Z', 'solved' => ['server' => 1, 'imported' => 0], 'attempts' => ['lastWeek' => 0, 'lastMonth' => 1], 'lastAttemptAt' => '2026-10-03T15:00:00.000Z'],
        ['id' => $this->ids['dani'], 'name' => 'Dani Sosa', 'email' => 'dani@stats.test', 'role' => 'student', 'status' => 'active',
            'lastActivityAt' => null, 'solved' => ['server' => 0, 'imported' => 0], 'attempts' => ['lastWeek' => 0, 'lastMonth' => 0], 'lastAttemptAt' => null],
        ['id' => $this->ids['fede'], 'name' => 'Fede Gómez', 'email' => 'fede@stats.test', 'role' => 'student', 'status' => 'active',
            'lastActivityAt' => '2026-10-09T12:00:00.000Z', 'solved' => ['server' => 0, 'imported' => 0], 'attempts' => ['lastWeek' => 0, 'lastMonth' => 1], 'lastAttemptAt' => '2026-10-04T12:00:00.000Z'],
    ])->and($response->json('meta'))->toBe(['page' => 1, 'perPage' => 25, 'total' => 5, 'lastPage' => 1]);
});

it('puts the students without activity last when the newest come first, and first the other way', function () {
    expect(studentNamesIn($this->browser->get('/api/admin/stats/students?sort=-lastActivity')->assertOk()->json('data')))
        ->toBe(['Ana Pérez', 'Beto Ruiz', 'Fede Gómez', 'Caro Díaz', 'Dani Sosa'])
        ->and(studentNamesIn($this->browser->get('/api/admin/stats/students?sort=lastActivity')->assertOk()->json('data')))
        ->toBe(['Dani Sosa', 'Caro Díaz', 'Fede Gómez', 'Beto Ruiz', 'Ana Pérez']);
});

it('keeps the students without activity since a local date, those that never had any included', function () {
    expect(studentNamesIn($this->browser->get('/api/admin/stats/students?inactiveSince=2026-10-10')->assertOk()->json('data')))
        ->toBe(['Caro Díaz', 'Dani Sosa', 'Fede Gómez']);
});

it('sorts and filters a head with a null last activity like an account without a head', function () {
    DB::table('progress_heads')->insert([
        'user_id' => $this->ids['dani'], 'epoch' => 1, 'revision' => 0, 'reset_at' => null, 'last_activity_at' => null,
        'created_at' => '2026-10-08 12:00:00.000', 'updated_at' => '2026-10-08 12:00:00.000',
    ]);

    expect(studentNamesIn($this->browser->get('/api/admin/stats/students?sort=lastActivity')->assertOk()->json('data')))
        ->toBe(['Dani Sosa', 'Caro Díaz', 'Fede Gómez', 'Beto Ruiz', 'Ana Pérez'])
        ->and(studentNamesIn($this->browser->get('/api/admin/stats/students?inactiveSince=2026-10-10')->assertOk()->json('data')))
        ->toBe(['Caro Díaz', 'Dani Sosa', 'Fede Gómez']);
});

it('searches by name or email, with the wildcards taken literally', function () {
    expect(studentNamesIn($this->browser->get('/api/admin/stats/students?q=bet')->assertOk()->json('data')))->toBe(['Beto Ruiz'])
        ->and(studentNamesIn($this->browser->get('/api/admin/stats/students?q=fede@')->assertOk()->json('data')))->toBe(['Fede Gómez'])
        ->and($this->browser->get('/api/admin/stats/students?q=%25')->assertOk()->json('data'))->toBe([]);
});

it('pages by offset like the accounts of C3b', function () {
    $response = $this->browser->get('/api/admin/stats/students?perPage=2&page=2')->assertOk();

    expect(studentNamesIn($response->json('data')))->toBe(['Caro Díaz', 'Dani Sosa'])
        ->and($response->json('meta'))->toBe(['page' => 2, 'perPage' => 2, 'total' => 5, 'lastPage' => 3]);
});

it('rejects an unknown sort, a bad date and an oversized page', function (string $query, string $field) {
    $this->browser->get("/api/admin/stats/students?{$query}")->assertStatus(422)->assertJsonValidationErrorFor($field, 'errors');
})->with([
    'sort' => ['sort=solved', 'sort'],
    'inactiveSince' => ['inactiveSince=10-10-2026', 'inactiveSince'],
    'perPage' => ['perPage=101', 'perPage'],
]);

it('logs nothing and shows no text of a student', function () {
    Log::spy();

    $body = (string) $this->browser->get('/api/admin/stats/students')->assertOk()->getContent();

    Log::shouldNotHaveReceived('info', fn (string $message, array $context = []) => $message === 'admin.student_viewed');
    foreach (StatsWorld::CANARIES as $canary) {
        expect($body)->not->toContain($canary);
    }
});
