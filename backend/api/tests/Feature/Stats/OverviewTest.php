<?php

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Tests\Support\Browser;
use Tests\Support\StatsWorld;

/**
 * @param  array<string, int>  $attempts
 * @param  array<string, int>  $operations
 * @param  array<string, int>  $firstSolves
 * @return array<string, mixed>
 */
function overviewFigures(array $attempts = [], array $operations = [], int $imported = 0, array $firstSolves = [], int $newStudents = 0, int $imports = 0, int $students = 0): array
{
    return [
        'attempts' => [...['passed' => 0, 'failed' => 0, 'compileError' => 0, 'runtimeError' => 0, 'timeout' => 0], ...$attempts],
        'operations' => [...['infraError' => 0, 'canceled' => 0], ...$operations],
        'importedAttempts' => $imported,
        'firstSolves' => [...['server' => 0, 'imported' => 0], ...$firstSolves],
        'newStudents' => $newStudents,
        'imports' => $imports,
        'studentsWhoRan' => $students,
    ];
}

beforeEach(function () {
    $this->travelTo(CarbonImmutable::parse(StatsWorld::NOW, 'UTC'));
    $this->ids = StatsWorld::create();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn(User::findOrFail($this->ids['admin']));
});

it('counts the accounts, the activity and each week of the period against the population counted by hand', function () {
    $response = $this->browser->get('/api/admin/stats/overview?from=2026-10-01&to=2026-10-20&granularity=week')->assertOk();

    expect($response->json('data'))->toBe([
        'accounts' => [
            ['role' => 'admin', 'status' => 'active', 'count' => 1],
            ['role' => 'admin', 'status' => 'disabled', 'count' => 0],
            ['role' => 'admin', 'status' => 'deleting', 'count' => 0],
            ['role' => 'student', 'status' => 'active', 'count' => 4],
            ['role' => 'student', 'status' => 'disabled', 'count' => 1],
            ['role' => 'student', 'status' => 'deleting', 'count' => 1],
        ],
        'activeStudents' => ['lastDay' => 1, 'lastWeek' => 2, 'lastMonth' => 3, 'never' => 1],
        'invitations' => ['pending' => 2, 'expired' => 1, 'pendingAdmin' => 1],
        'resetStudents' => 1,
        'totals' => overviewFigures(['passed' => 4, 'failed' => 1, 'compileError' => 1], ['infraError' => 1, 'canceled' => 1], 1, ['server' => 3, 'imported' => 1], 2, 1, 4),
        'series' => [
            ['start' => '2026-10-01', ...overviewFigures(['passed' => 2], [], 1, ['server' => 1, 'imported' => 1], 1, 1, 2)],
            ['start' => '2026-10-05', ...overviewFigures(['passed' => 1, 'failed' => 1, 'compileError' => 1], ['infraError' => 1, 'canceled' => 1], 0, ['server' => 1], 1, 0, 1)],
            ['start' => '2026-10-12', ...overviewFigures(['passed' => 1], [], 0, ['server' => 1], 0, 0, 1)],
            ['start' => '2026-10-19', ...overviewFigures()],
        ],
    ])->and($response->json('meta.period'))->toBe(['from' => '2026-10-01', 'to' => '2026-10-20', 'granularity' => 'week', 'timezone' => 'America/Argentina/Buenos_Aires'])
        ->and($response->json('meta.generatedAt'))->toBe('2026-10-20T15:00:00.000Z');
});

it('cuts the days at the local midnight and keeps the empty ones', function () {
    $series = $this->browser->get('/api/admin/stats/overview?from=2026-10-01&to=2026-10-20&granularity=day')->assertOk()->json('data.series');

    expect($series)->toHaveCount(20)
        ->and($series[4])->toBe(['start' => '2026-10-05', ...overviewFigures(['passed' => 1, 'failed' => 1, 'compileError' => 1], [], 0, ['server' => 1], 0, 0, 1)])
        ->and($series[5])->toBe(['start' => '2026-10-06', ...overviewFigures()]);
});

it('takes the last thirty local days when no period comes', function () {
    $response = $this->browser->get('/api/admin/stats/overview')->assertOk();

    expect($response->json('meta.period'))->toBe(['from' => '2026-09-21', 'to' => '2026-10-20', 'granularity' => 'day', 'timezone' => 'America/Argentina/Buenos_Aires'])
        ->and($response->json('data.series'))->toHaveCount(30);
});

it('serves the same figures for ten minutes and computes them again after', function () {
    $url = '/api/admin/stats/overview?from=2026-10-01&to=2026-10-20&granularity=week';
    $first = $this->browser->get($url)->assertOk()->json();
    DB::table('attempts')->insert([
        'user_id' => $this->ids['ana'], 'exercise_id' => 'rust-01', 'epoch' => 1, 'legacy' => 0, 'outcome' => 'passed', 'grading_hash' => str_repeat('a', 64),
        'code_sha256' => str_repeat('e', 64), 'attempted_at' => '2026-10-15 12:00:00.000', 'started_at' => '2026-10-15 12:00:00.000',
        'finished_at' => '2026-10-15 12:00:00.000', 'created_at' => '2026-10-15 12:00:00.000',
    ]);

    $this->travel(599)->seconds();
    $cached = $this->browser->get($url)->assertOk()->json();
    $this->travel(2)->seconds();
    $fresh = $this->browser->get($url)->assertOk()->json();

    expect($cached)->toBe($first)
        ->and($fresh['data']['totals']['attempts']['passed'])->toBe(5)
        ->and($fresh['meta']['generatedAt'])->toBe('2026-10-20T15:10:01.000Z');
});

it('rejects a period that is reversed, too long, incomplete or with an unknown granularity', function (string $query, string $field) {
    $this->browser->get("/api/admin/stats/overview?{$query}")->assertStatus(422)
        ->assertJsonPath('code', 'validation_failed')
        ->assertJsonValidationErrorFor($field, 'errors');
})->with([
    'reversed' => ['from=2026-10-20&to=2026-10-01', 'to'],
    'longer than 366 days' => ['from=2025-10-19&to=2026-10-20', 'to'],
    'without to' => ['from=2026-10-01', 'to'],
    'without from' => ['to=2026-10-01', 'from'],
    'an impossible date' => ['from=2026-02-30&to=2026-03-01', 'from'],
    'a year granularity' => ['granularity=year', 'granularity'],
]);

it('shows no text of a student', function () {
    $body = (string) $this->browser->get('/api/admin/stats/overview?from=2026-10-01&to=2026-10-20')->assertOk()->getContent();

    foreach (StatsWorld::CANARIES as $canary) {
        expect($body)->not->toContain($canary);
    }
});
