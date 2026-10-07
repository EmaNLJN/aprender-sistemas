<?php

use App\Runs\Admission\RunAdmission;
use App\Runs\Admission\RunRejected;
use App\Runs\Admission\SubmittedRun;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\Parallel;
use Tests\Support\RunInvariants;
use Tests\Support\RunWorld;

beforeEach(fn () => RunWorld::exercise());

/**
 * @param  array<string, mixed>  $limits
 *
 * A child process does not load the helper functions of this file, so each task carries its own logic.
 */
function admissionTask(int $userId, string $clientRunId, array $limits = []): Closure
{
    return function () use ($userId, $clientRunId, $limits): string {
        config($limits);
        try {
            $result = app(RunAdmission::class)->admit($userId, new SubmittedRun($clientRunId, 'rust-01', 'fn main() {}', null));
        } catch (RunRejected $rejected) {
            return 'rejected:'.($rejected->rejection->quota?->value ?? $rejected->rejection->kind->name);
        }

        return $result->created ? 'created' : 'retry';
    };
}

it('leaves one run and one job when twenty processes send the same request', function () {
    $user = RunWorld::user();
    $clientRunId = (string) Str::uuid();

    $tasks = [];
    foreach (range(1, 20) as $index) {
        $tasks["process-{$index}"] = admissionTask($user->id, $clientRunId);
    }
    $outcomes = array_count_values(Parallel::run($tasks));

    expect($outcomes)->toEqual(['created' => 1, 'retry' => 19])
        ->and(DB::table('runs')->count())->toBe(1)
        ->and(DB::table('jobs')->count())->toBe(1);
    RunInvariants::assertClean();
});

it('admits one of two runs that the same account sends at once and rejects the other for the active quota', function () {
    $user = RunWorld::user();

    $outcomes = Parallel::run([
        'first' => admissionTask($user->id, '0199f4a2-8e03-7c5a-b3d1-9a77c0de4f21'),
        'second' => admissionTask($user->id, '0199f4a2-8e03-7c5a-b3d1-9a77c0de4f22'),
    ]);

    expect(array_count_values($outcomes))->toEqual(['created' => 1, 'rejected:active' => 1])
        ->and(DB::table('runs')->count())->toBe(1)
        ->and(DB::table('jobs')->count())->toBe(1);
});

function hundredAccountsSend(array $limits): array
{
    $userIds = [];
    foreach (range(1, 100) as $index) {
        $userIds[] = RunWorld::user()->id;
    }

    $tasks = [];
    foreach (array_chunk($userIds, 5) as $index => $chunk) {
        $tasks["process-{$index}"] = function () use ($chunk, $limits): array {
            config($limits);
            $outcomes = [];
            foreach ($chunk as $userId) {
                try {
                    $result = app(RunAdmission::class)->admit($userId, new SubmittedRun((string) Str::uuid(), 'rust-01', 'fn main() {}', null));
                    $outcomes[] = $result->created ? 'created' : 'retry';
                } catch (RunRejected $rejected) {
                    $outcomes[] = 'rejected:'.$rejected->rejection->kind->name;
                }
            }

            return $outcomes;
        };
    }

    return array_merge(...array_values(Parallel::run($tasks)));
}

function runsWithoutExactlyOneJob(): int
{
    $payloads = DB::table('jobs')->pluck('payload')->all();
    $broken = 0;
    foreach (DB::table('runs')->pluck('id') as $runId) {
        $jobsOfRun = count(array_filter($payloads, fn (string $payload) => str_contains($payload, (string) $runId)));
        $broken += $jobsOfRun === 1 ? 0 : 1;
    }

    return $broken;
}

it('leaves a hundred runs and a hundred jobs when a hundred accounts send from twenty processes', function () {
    hundredAccountsSend(['runs.queue.max_waiting' => 1000]);

    expect(DB::table('runs')->count())->toBe(100)
        ->and(DB::table('jobs')->count())->toBe(100)
        ->and(runsWithoutExactlyOneJob())->toBe(0);
    RunInvariants::assertClean();
});

it('keeps a job for every accepted run, and for no other, with the default queue limit', function () {
    $outcomes = array_count_values(hundredAccountsSend([]));

    $accepted = $outcomes['created'] ?? 0;
    $rejected = $outcomes['rejected:QueueFull'] ?? 0;
    expect($accepted + $rejected)->toBe(100)
        ->and($accepted)->toBeGreaterThanOrEqual(32)
        ->and(DB::table('runs')->count())->toBe($accepted)
        ->and(DB::table('jobs')->count())->toBe($accepted)
        ->and(runsWithoutExactlyOneJob())->toBe(0);
    RunInvariants::assertClean();
});
