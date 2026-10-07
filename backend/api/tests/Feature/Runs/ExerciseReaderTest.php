<?php

use App\Runs\Admission\ExerciseReader;
use App\Runs\Program\ExpectedTest;
use App\Runs\RunLanguage;
use Illuminate\Support\Facades\DB;
use Tests\Support\RunWorld;

it('reads the active exercise with its active tests in position order, its grading hash, imports and template', function () {
    RunWorld::exercise('go-01', 'go', [
        ['key' => 'b', 'expression' => 'x == 1'],
        ['key' => 'a', 'expression' => 'y == 2'],
    ], ['strings', 'fmt']);

    $snapshot = app(ExerciseReader::class)->forRun('go-01');

    expect($snapshot->exerciseId)->toBe('go-01')
        ->and($snapshot->language)->toBe(RunLanguage::Go)
        ->and($snapshot->gradingHash)->toBe(hash('sha256', 'go-01'))
        ->and($snapshot->imports)->toBe(['strings', 'fmt'])
        ->and($snapshot->tests)->toEqual([new ExpectedTest('b', 'x == 1', 1), new ExpectedTest('a', 'y == 2', 2)])
        ->and($snapshot->template)->toBe((string) DB::table('harness_templates')->where('language', 'go')->value('template'));
});

it('keeps test keys made of digits as text', function () {
    RunWorld::exercise('rust-01', 'rust', [['key' => '123', 'expression' => 'true']]);

    $snapshot = app(ExerciseReader::class)->forRun('rust-01');

    expect($snapshot->tests[0]->key)->toBe('123');
});

it('leaves out a retired test', function () {
    RunWorld::exercise();
    DB::table('exercise_tests')->where('test_key', 't2')->update(['status' => 'deprecated', 'retired_at' => now(), 'position' => null]);

    $snapshot = app(ExerciseReader::class)->forRun('rust-01');

    expect(array_map(fn (ExpectedTest $test) => $test->key, $snapshot->tests))->toBe(['t1', 't3']);
});

it('answers null for a retired exercise, an unknown one and a malformed id', function (string $id) {
    RunWorld::exercise('rust-01');
    RunWorld::exercise('rust-02');
    DB::table('exercises')->where('id', 'rust-02')->update(['status' => 'deprecated', 'retired_at' => now(), 'position' => null]);

    expect(app(ExerciseReader::class)->forRun($id))->toBeNull();
})->with(['retired' => 'rust-02', 'unknown' => 'rust-99', 'upper case' => 'RUST-01', 'with a trailing line break' => "rust-01\n", 'empty' => '', 'too long' => str_repeat('a', 65)]);
