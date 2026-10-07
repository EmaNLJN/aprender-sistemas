<?php

use App\Progress\ProgressAreas;
use Tests\TestCase;

uses(TestCase::class);

it('serializes an empty set of areas as the empty snapshot of http.md section 4', function () {
    expect((new ProgressAreas)->toArray(true))->toBe([
        'full' => true,
        'exercises' => [],
        'drafts' => [],
        'campaign' => ['seals' => [], 'checkpoints' => []],
        'workshops' => ['progress' => [], 'objectives' => [], 'steps' => []],
        'route' => ['marks' => [], 'quiz' => [], 'notes' => []],
        'preferences' => null,
    ]);
});

it('says full false for a delta', function () {
    expect((new ProgressAreas)->toArray(false)['full'])->toBeFalse();
});

it('places each row in its area without transforming it', function () {
    $exercise = ['exerciseId' => 'rust-01', 'revision' => 3];
    $draft = ['exerciseId' => 'rust-01', 'code' => null, 'revision' => 4];
    $seal = ['worldId' => 'w1'];
    $checkpoint = ['worldId' => 'w1', 'passed' => true];
    $progress = ['workshopId' => 'ws1', 'language' => 'rust'];
    $objective = ['workshopId' => 'ws1', 'objectiveKey' => 'o1'];
    $step = ['workshopId' => 'ws1', 'stepKey' => 'e1'];
    $mark = ['kind' => 'step', 'itemKey' => 's1'];
    $quiz = ['stepId' => 's1', 'answer' => 2];
    $note = ['language' => 'go', 'field' => 'next'];
    $preferences = ['focusMinutes' => ['value' => 25, 'at' => '2026-10-06T12:00:00.000Z']];

    $areas = new ProgressAreas(
        exercises: [$exercise], drafts: [$draft], campaignSeals: [$seal], campaignCheckpoints: [$checkpoint],
        workshopProgress: [$progress], workshopObjectives: [$objective], workshopSteps: [$step],
        routeMarks: [$mark], routeQuiz: [$quiz], routeNotes: [$note], preferences: $preferences,
    );

    expect($areas->toArray(false))->toBe([
        'full' => false,
        'exercises' => [$exercise],
        'drafts' => [$draft],
        'campaign' => ['seals' => [$seal], 'checkpoints' => [$checkpoint]],
        'workshops' => ['progress' => [$progress], 'objectives' => [$objective], 'steps' => [$step]],
        'route' => ['marks' => [$mark], 'quiz' => [$quiz], 'notes' => [$note]],
        'preferences' => $preferences,
    ]);
});
