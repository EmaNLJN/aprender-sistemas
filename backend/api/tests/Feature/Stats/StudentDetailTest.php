<?php

use App\Admin\PublishedAdminUser;
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

function noAttempts(): array
{
    return [
        'attempts' => ['passed' => 0, 'failed' => 0, 'compileError' => 0, 'runtimeError' => 0, 'timeout' => 0],
        'operations' => ['infraError' => 0, 'canceled' => 0],
        'importedAttempts' => 0,
    ];
}

it('shows the usage of a student exercise by exercise, counted by hand and without any text', function () {
    $anaAttempts = [
        'attempts' => ['passed' => 1, 'failed' => 1, 'compileError' => 1, 'runtimeError' => 0, 'timeout' => 0],
        'operations' => ['infraError' => 0, 'canceled' => 0],
        'importedAttempts' => 0,
    ];

    $response = $this->browser->get("/api/admin/stats/students/{$this->ids['ana']}?from=2026-10-01&to=2026-10-20&granularity=week")->assertOk();

    expect($response->json('data'))->toBe([
        'account' => PublishedAdminUser::from(User::findOrFail($this->ids['ana']))->toPublished(),
        'progress' => ['epoch' => 1, 'resetAt' => null, 'lastActivityAt' => '2026-10-20T10:00:00.000Z'],
        'imports' => [],
        'solvedByCatalog' => [
            ['catalog' => 'lab', 'language' => 'go', 'server' => 0, 'imported' => 0],
            ['catalog' => 'lab', 'language' => 'rust', 'server' => 1, 'imported' => 0],
        ],
        'attempts' => ['inPeriod' => $anaAttempts, 'total' => $anaAttempts],
        'activity' => [
            ['start' => '2026-10-01', 'attempts' => 0],
            ['start' => '2026-10-05', 'attempts' => 3],
            ['start' => '2026-10-12', 'attempts' => 0],
            ['start' => '2026-10-19', 'attempts' => 0],
        ],
        'quota' => ['active' => 0, 'lastMinute' => 0, 'lastDay' => 1, 'sandboxMs' => 500, 'limits' => ['active' => 1, 'perMinute' => 10, 'perDay' => 300, 'sandboxMinutes' => 30]],
        'exercises' => [
            ['exerciseId' => 'go-01', 'state' => 'attempted', 'solvedAt' => null, 'serverSolvedAt' => null, 'attemptCount' => 1, 'lastAttemptAt' => '2026-10-06T02:30:00.000Z',
                'lastOutcome' => 'compile_error', 'assisted' => false, 'solutionSeen' => false, 'hintsRevealed' => null, 'predictionAnswered' => false, 'predictionCorrect' => false,
                'confidence' => null, 'reviewDueAt' => null],
            ['exerciseId' => 'rust-01', 'state' => 'solved', 'solvedAt' => '2026-10-05T13:00:00.000Z', 'serverSolvedAt' => '2026-10-05T13:00:00.000Z', 'attemptCount' => 2,
                'lastAttemptAt' => '2026-10-05T13:00:00.000Z', 'lastOutcome' => 'passed', 'assisted' => true, 'solutionSeen' => false, 'hintsRevealed' => 1,
                'predictionAnswered' => true, 'predictionCorrect' => true, 'confidence' => 'confident', 'reviewDueAt' => '2026-10-25T13:00:00.000Z'],
        ],
        'campaign' => ['checkpoints' => [['worldId' => 'fx-world-1', 'answered' => true, 'passed' => true, 'passedAt' => '2026-10-06T12:00:00.000Z']], 'sealedExercises' => 0],
        'workshops' => [['workshopId' => 'fx-workshop-1', 'language' => 'rust', 'codeSealed' => true, 'predictionAnswered' => true, 'predictionCorrect' => true, 'stepsMarked' => 1, 'objectivesObserved' => 1]],
        'route' => ['steps' => 1, 'milestones' => 1, 'favorites' => 0, 'quizAnswered' => 1],
    ]);
    foreach (StatsWorld::CANARIES as $canary) {
        expect((string) $response->getContent())->not->toContain($canary);
    }
});

it('shows passed attempts and nothing solved after a reset', function () {
    $data = $this->browser->get("/api/admin/stats/students/{$this->ids['fede']}?from=2026-10-01&to=2026-10-20")->assertOk()->json('data');

    expect($data['progress'])->toBe(['epoch' => 2, 'resetAt' => '2026-10-09T12:00:00.000Z', 'lastActivityAt' => '2026-10-09T12:00:00.000Z'])
        ->and($data['exercises'])->toBe([])
        ->and($data['solvedByCatalog'])->toBe([])
        ->and($data['attempts']['total']['attempts']['passed'])->toBe(1);
});

it('shows an imported solve and the import of a student without its report', function () {
    $data = $this->browser->get("/api/admin/stats/students/{$this->ids['beto']}?from=2026-10-01&to=2026-10-20")->assertOk()->json('data');

    expect($data['imports'])->toBe([['importedAt' => '2026-10-02T10:00:00.000Z', 'source' => 'storage', 'epoch' => 1]])
        ->and($data['solvedByCatalog'])->toBe([
            ['catalog' => 'lab', 'language' => 'rust', 'server' => 0, 'imported' => 1],
            ['catalog' => 'quests', 'language' => 'rust', 'server' => 1, 'imported' => 0],
        ])
        ->and($data['attempts']['total'])->toBe([
            'attempts' => ['passed' => 1, 'failed' => 0, 'compileError' => 0, 'runtimeError' => 0, 'timeout' => 0],
            'operations' => ['infraError' => 1, 'canceled' => 1],
            'importedAttempts' => 1,
        ])
        ->and($data['campaign']['sealedExercises'])->toBe(1);
});

it('shows a student that never practised with an empty usage', function () {
    $data = $this->browser->get("/api/admin/stats/students/{$this->ids['dani']}?from=2026-10-19&to=2026-10-20")->assertOk()->json('data');

    expect($data['progress'])->toBe(['epoch' => 1, 'resetAt' => null, 'lastActivityAt' => null])
        ->and($data['attempts'])->toBe(['inPeriod' => noAttempts(), 'total' => noAttempts()])
        ->and($data['activity'])->toBe([['start' => '2026-10-19', 'attempts' => 0], ['start' => '2026-10-20', 'attempts' => 0]])
        ->and($data['exercises'])->toBe([])
        ->and($data['route'])->toBe(['steps' => 0, 'milestones' => 0, 'favorites' => 0, 'quizAnswered' => 0]);
});

it('shows the detail of an admin as of any other account', function () {
    $this->browser->get("/api/admin/stats/students/{$this->ids['admin']}")->assertOk()->assertJsonPath('data.account.role', 'admin');
});

it('answers 404 to an account being deleted and to one that does not exist', function () {
    $this->browser->get("/api/admin/stats/students/{$this->ids['eva']}")->assertStatus(404)->assertJsonPath('code', 'not_found');
    $this->browser->get('/api/admin/stats/students/999999')->assertStatus(404)->assertJsonPath('code', 'not_found');
});

it('answers 404 to the next request once the account starts its deletion and caches nothing about it', function () {
    $this->browser->get("/api/admin/stats/students/{$this->ids['ana']}")->assertOk();
    DB::table('users')->where('id', $this->ids['ana'])->update(['status' => 'deleting']);

    $this->browser->get("/api/admin/stats/students/{$this->ids['ana']}")->assertStatus(404);
    expect(DB::table('cache')->where('key', 'like', '%stats:v1:%')->count())->toBe(0);
});

it('logs each successful detail with the admin, the account and the view, and nothing else', function () {
    Log::spy();

    $this->browser->get("/api/admin/stats/students/{$this->ids['ana']}")->assertOk();
    $this->browser->get('/api/admin/stats/students/999999')->assertStatus(404);

    Log::shouldHaveReceived('info')->once()->withArgs(fn (string $message, array $context = []) => $message === 'admin.student_viewed'
        && $context === ['target_id' => $this->ids['ana'], 'view' => 'detail']);
});
