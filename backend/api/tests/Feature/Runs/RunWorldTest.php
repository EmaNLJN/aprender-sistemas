<?php

use App\Models\User;
use App\Runs\Record\Instant;
use App\Runs\RunStatus;
use Illuminate\Support\Facades\DB;
use Tests\Support\RunInvariants;
use Tests\Support\RunWorld;

it('leaves an active exercise with its three tests, its grading version and the template of its language', function () {
    RunWorld::exercise();

    $exercise = DB::selectOne("select * from exercises where id = 'rust-01'");
    $tests = DB::select("select test_key, position, expression from exercise_tests where exercise_id = 'rust-01' order by position");
    $versions = DB::select("select grading_hash from exercise_grading_versions where exercise_id = 'rust-01'");
    $template = DB::selectOne("select template from harness_templates where language = 'rust'");

    expect($exercise->status)->toBe('active')
        ->and($exercise->language)->toBe('rust')
        ->and(array_map(fn (object $test) => [$test->test_key, $test->position], $tests))->toBe([['t1', 1], ['t2', 2], ['t3', 3]])
        ->and($tests[0]->expression)->not->toBe('')
        ->and(array_map(fn (object $version) => $version->grading_hash, $versions))->toBe([$exercise->grading_hash])
        ->and($template->template)->toContain('{{code}}')->toContain('{{#tests}}')->toContain('{{nonce}}')->toContain('{{count}}');
});

it('lets the tests, the language and the imports be chosen', function () {
    RunWorld::exercise('go-07', 'go', [['key' => '123', 'expression' => 'sum(1, 2) == 3'], ['key' => 'alpha_2', 'expression' => 'true']], ['strings', 'errors']);

    $exercise = DB::selectOne("select language, imports_json, key_order from exercises where id = 'go-07'");
    $keys = DB::table('exercise_tests')->where('exercise_id', 'go-07')->orderBy('position')->pluck('test_key')->all();
    $template = DB::selectOne("select template from harness_templates where language = 'go'");

    expect($exercise->language)->toBe('go')
        ->and(json_decode($exercise->imports_json, true))->toBe(['strings', 'errors'])
        ->and($keys)->toBe(['123', 'alpha_2'])
        ->and($template->template)->toContain('{{#imports}}')->toContain('{{name}}');
});

it('can build several exercises of both languages', function () {
    RunWorld::exercise('rust-01');
    RunWorld::exercise('rust-02');
    RunWorld::exercise('go-01', 'go');

    expect(DB::table('exercises')->count())->toBe(3)
        ->and(DB::table('harness_templates')->count())->toBe(2);
});

it('builds a user from the factory, with the given state', function () {
    $user = RunWorld::user(['name' => 'Ana']);
    $disabled = RunWorld::user(['status' => 'disabled']);

    expect($user)->toBeInstanceOf(User::class)
        ->and($user->name)->toBe('Ana')
        ->and($disabled->status->value)->toBe('disabled');
});

it('leaves a queued run whose record matches the request and respects the invariants', function () {
    RunWorld::exercise();
    $user = RunWorld::user();
    $this->travelTo(Instant::parse('2026-10-05 12:00:00.000'));

    $run = RunWorld::run($user, ['code' => 'fn main() {}', 'epoch' => 4, 'client_run_id' => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa']);

    expect($run->userId)->toBe($user->id)
        ->and($run->exerciseId)->toBe('rust-01')
        ->and($run->status)->toBe(RunStatus::Queued)
        ->and($run->code)->toBe('fn main() {}')
        ->and($run->epoch)->toBe(4)
        ->and($run->clientRunId)->toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
        ->and($run->expectedTests)->toBe(['t1', 't2', 't3'])
        ->and($run->expiresAt?->format('H:i:s'))->toBe('12:10:00')
        ->and($run->finishedAt)->toBeNull();
    RunInvariants::assertClean();
});

it('leaves a running run when asked, with the timestamps the invariants require', function () {
    RunWorld::exercise();
    $user = RunWorld::user();
    $now = Instant::now();

    $run = RunWorld::run($user, ['status' => 'running', 'started_at' => $now, 'expires_at' => $now->addSeconds(140)]);

    expect($run->status)->toBe(RunStatus::Running)
        ->and($run->startedAt)->not->toBeNull();
    RunInvariants::assertClean();
});

it('creates the exercise of a run when it does not exist yet', function () {
    $run = RunWorld::run(RunWorld::user(), ['exercise_id' => 'go-03', 'language' => 'go']);

    expect($run->exerciseId)->toBe('go-03')
        ->and(DB::table('exercises')->where('id', 'go-03')->value('language'))->toBe('go');
});

it('leaves a run whose account no longer exists', function () {
    RunWorld::exercise();
    $user = RunWorld::user();

    $run = RunWorld::orphanRun($user);

    expect(DB::table('users')->where('id', $user->id)->exists())->toBeFalse()
        ->and(DB::table('runs')->where('id', $run->id)->exists())->toBeTrue()
        ->and($run->userId)->toBe($user->id)
        ->and(DB::selectOne('select @@foreign_key_checks as v')->v)->toBe(1);
});
