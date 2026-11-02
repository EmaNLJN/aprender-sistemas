<?php

use App\Models\User;
use Carbon\CarbonImmutable;
use Tests\Support\Browser;
use Tests\Support\StatsWorld;

/** @return array<string, mixed> */
function exerciseStats(string $id, string $catalog, string $language, ?string $level, array $overrides = []): array
{
    return [
        'exerciseId' => $id, 'catalog' => $catalog, 'language' => $language, 'level' => $level, 'retired' => false,
        'studentsStarted' => 0,
        'solved' => ['server' => 0, 'imported' => 0],
        'attempts' => ['passed' => 0, 'failed' => 0, 'compileError' => 0, 'runtimeError' => 0, 'timeout' => 0],
        'operations' => ['infraError' => 0, 'canceled' => 0],
        'importedAttempts' => 0,
        'attemptsMedian' => ['solved' => null, 'unsolved' => null],
        'help' => ['assisted' => 0, 'solutionSeen' => 0, 'hintsRevealed' => []],
        'prediction' => ['answered' => 0, 'correct' => 0, 'options' => []],
        'confidence' => ['again' => 0, 'practice' => 0, 'confident' => 0],
        'tests' => [],
        ...$overrides,
    ];
}

function rustOneStats(): array
{
    return exerciseStats('rust-01', 'lab', 'rust', null, [
        'studentsStarted' => 3,
        'solved' => ['server' => 2, 'imported' => 1],
        'attempts' => ['passed' => 3, 'failed' => 1, 'compileError' => 0, 'runtimeError' => 0, 'timeout' => 0],
        'importedAttempts' => 1,
        'attemptsMedian' => ['solved' => 1, 'unsolved' => null],
        'help' => ['assisted' => 1, 'solutionSeen' => 0, 'hintsRevealed' => [['hints' => 0, 'students' => 1], ['hints' => 1, 'students' => 1]]],
        'prediction' => ['answered' => 2, 'correct' => 1, 'options' => [['option' => 0, 'students' => 1], ['option' => 2, 'students' => 1]]],
        'confidence' => ['again' => 1, 'practice' => 0, 'confident' => 1],
        'tests' => [
            ['testKey' => 't1', 'verdicts' => 4, 'fail' => 0, 'missing' => 0],
            ['testKey' => 't2', 'verdicts' => 4, 'fail' => 1, 'missing' => 0],
            ['testKey' => 't3', 'verdicts' => 4, 'fail' => 0, 'missing' => 1],
        ],
    ]);
}

beforeEach(function () {
    $this->travelTo(CarbonImmutable::parse(StatsWorld::NOW, 'UTC'));
    $this->ids = StatsWorld::create();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn(User::findOrFail($this->ids['admin']));
});

it('counts a catalog and its exercises, retired ones included, against the population counted by hand', function () {
    $response = $this->browser->get('/api/admin/stats/exercises?catalog=lab&language=rust&from=2026-10-01&to=2026-10-20')->assertOk();

    expect($response->json('data.catalogs'))->toBe([
        ['catalog' => 'lab', 'language' => 'rust', 'level' => null, 'activeExercises' => 1, 'studentsStarted' => 3, 'studentsSolved' => 3, 'solvedMedian' => 1],
    ])->and($response->json('data.exercises'))->toBe([
        rustOneStats(),
        exerciseStats('rust-02', 'lab', 'rust', null, ['retired' => true]),
    ])->and($response->json('meta.filters'))->toBe(['catalog' => 'lab', 'language' => 'rust', 'level' => null]);
});

it('orders every catalog by its chain and shows a new catalog without code', function () {
    $response = $this->browser->get('/api/admin/stats/exercises?from=2026-10-01&to=2026-10-20')->assertOk();

    expect($response->json('data.catalogs'))->toBe([
        ['catalog' => 'essentials', 'language' => 'rust', 'level' => null, 'activeExercises' => 1, 'studentsStarted' => 0, 'studentsSolved' => 0, 'solvedMedian' => null],
        ['catalog' => 'lab', 'language' => 'go', 'level' => null, 'activeExercises' => 1, 'studentsStarted' => 1, 'studentsSolved' => 0, 'solvedMedian' => 0],
        ['catalog' => 'lab', 'language' => 'rust', 'level' => null, 'activeExercises' => 1, 'studentsStarted' => 3, 'studentsSolved' => 3, 'solvedMedian' => 1],
        ['catalog' => 'quests', 'language' => 'rust', 'level' => 'beginner', 'activeExercises' => 1, 'studentsStarted' => 1, 'studentsSolved' => 1, 'solvedMedian' => 1],
    ])->and(array_column($response->json('data.exercises'), 'exerciseId'))->toBe(['ess-rust-01', 'go-01', 'rust-01', 'rust-02', 'q-rust-01'])
        ->and($response->json('data.exercises.1'))->toBe(exerciseStats('go-01', 'lab', 'go', null, [
            'studentsStarted' => 1,
            'attempts' => ['passed' => 0, 'failed' => 0, 'compileError' => 1, 'runtimeError' => 0, 'timeout' => 0],
            'operations' => ['infraError' => 1, 'canceled' => 1],
            'attemptsMedian' => ['solved' => null, 'unsolved' => 1],
        ]))
        ->and($response->json('data.exercises.4'))->toBe(exerciseStats('q-rust-01', 'quests', 'rust', 'beginner', [
            'studentsStarted' => 1,
            'solved' => ['server' => 1, 'imported' => 0],
            'attempts' => ['passed' => 1, 'failed' => 0, 'compileError' => 0, 'runtimeError' => 0, 'timeout' => 0],
            'attemptsMedian' => ['solved' => 1, 'unsolved' => null],
            'tests' => [
                ['testKey' => 't1', 'verdicts' => 1, 'fail' => 0, 'missing' => 0],
                ['testKey' => 't2', 'verdicts' => 1, 'fail' => 0, 'missing' => 0],
                ['testKey' => 't3', 'verdicts' => 1, 'fail' => 0, 'missing' => 0],
            ],
        ]));
});

it('applies the period to the attempts and not to the current state', function () {
    $response = $this->browser->get('/api/admin/stats/exercises?catalog=lab&language=rust&from=2026-10-12&to=2026-10-20')->assertOk();

    expect($response->json('data.exercises.0'))->toBe([
        ...rustOneStats(),
        'attempts' => ['passed' => 0, 'failed' => 0, 'compileError' => 0, 'runtimeError' => 0, 'timeout' => 0],
        'importedAttempts' => 0,
        'tests' => [],
    ]);
});

it('rejects an unknown catalog, language or level', function (string $query, string $field) {
    $this->browser->get("/api/admin/stats/exercises?{$query}")->assertStatus(422)->assertJsonValidationErrorFor($field, 'errors');
})->with([
    'catalog' => ['catalog=nope', 'catalog'],
    'language' => ['language=python', 'language'],
    'level' => ['level=master', 'level'],
]);

it('shows no text of a student', function () {
    $body = (string) $this->browser->get('/api/admin/stats/exercises')->assertOk()->getContent();

    foreach (StatsWorld::CANARIES as $canary) {
        expect($body)->not->toContain($canary);
    }
});

it('counts the world, the workshop in each language and the route against the population counted by hand', function () {
    $data = $this->browser->get('/api/admin/stats/exercises?from=2026-10-01&to=2026-10-20')->assertOk()->json('data');

    expect(array_keys($data))->toBe(['catalogs', 'exercises', 'worlds', 'workshops', 'route'])
        ->and($data['worlds'])->toBe([
            ['worldId' => 'fx-world-1', 'language' => 'rust', 'level' => 'beginner', 'retired' => false, 'exercises' => 1, 'solvedRows' => 3, 'studentsWithSeals' => 1,
                'checkpoint' => ['answered' => 2, 'passed' => 1, 'options' => [['option' => 1, 'students' => 1], ['option' => 2, 'students' => 1]]]],
        ])
        ->and($data['workshops'])->toBe([
            ['workshopId' => 'fx-workshop-1', 'language' => 'rust', 'level' => 'beginner', 'retired' => false, 'studentsStarted' => 2, 'codeSealed' => 1,
                'prediction' => ['answered' => 1, 'correct' => 1, 'options' => [['option' => 1, 'students' => 1]]],
                'stepsMarkedMedian' => 0.5, 'objectivesObservedMedian' => 0.5],
            ['workshopId' => 'fx-workshop-1', 'language' => 'go', 'level' => 'beginner', 'retired' => false, 'studentsStarted' => 0, 'codeSealed' => 0,
                'prediction' => ['answered' => 0, 'correct' => 0, 'options' => []],
                'stepsMarkedMedian' => null, 'objectivesObservedMedian' => null],
        ])
        ->and($data['route'])->toBe([
            'marks' => [['kind' => 'step', 'itemKey' => 'fx-step-1', 'students' => 2], ['kind' => 'milestone', 'itemKey' => 'm-01', 'students' => 1]],
            'quiz' => [['stepId' => 'fx-step-1', 'answered' => 2, 'options' => [['option' => 0, 'students' => 1], ['option' => 1, 'students' => 1]]]],
        ]);
});

it('filters the worlds and the workshops by language', function () {
    $data = $this->browser->get('/api/admin/stats/exercises?language=go')->assertOk()->json('data');

    expect($data['worlds'])->toBe([])
        ->and(array_column($data['workshops'], 'language'))->toBe(['go']);
});
