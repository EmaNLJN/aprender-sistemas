<?php

use App\Models\User;
use App\Runs\Admission\QuotaKind;
use App\Runs\Admission\RejectionKind;
use App\Runs\Admission\RunAdmission;
use App\Runs\Admission\RunRejected;
use App\Runs\Admission\SubmittedRun;
use App\Runs\Execution\RunWriteFailed;
use App\Runs\Record\Instant;
use App\Runs\RunStatus;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Tests\Support\RunInvariants;
use Tests\Support\RunWorld;

const ADMISSION_NOW = '2026-10-05 12:00:00.000';

const FIRST_CLIENT_RUN_ID = '0199f4a2-8e03-7c5a-b3d1-9a77c0de4f21';

beforeEach(function () {
    $this->travelTo(Instant::parse(ADMISSION_NOW));
    RunWorld::exercise();
});

function submission(string $clientRunId = FIRST_CLIENT_RUN_ID, string $code = 'fn main() {}', ?string $customTest = null, string $exerciseId = 'rust-01'): SubmittedRun
{
    return new SubmittedRun($clientRunId, $exerciseId, $code, $customTest);
}

function admit(User $user, SubmittedRun $request)
{
    return app(RunAdmission::class)->admit($user->id, $request);
}

function rejectionOf(User $user, SubmittedRun $request)
{
    try {
        admit($user, $request);
    } catch (RunRejected $rejected) {
        return $rejected->rejection;
    }

    throw new RuntimeException('The admission accepted a request that had to be rejected.');
}

function leavesNoTrace(User $user): void
{
    expect(DB::table('runs')->where('user_id', $user->id)->count())->toBe(0)
        ->and(DB::table('jobs')->count())->toBe(0)
        ->and(DB::table('progress_heads')->where('user_id', $user->id)->count())->toBe(0);
}

/** @param array<string, mixed> $overrides */
function closedRun(User $user, string $status, CarbonImmutable $createdAt, array $overrides = []): void
{
    RunWorld::run($user, ['status' => $status, 'created_at' => $createdAt, 'finished_at' => $createdAt, ...$overrides]);
}

describe('admits', function () {
    it('stores a queued run with the data of the exercise, the epoch of the head and the composed program', function () {
        $user = RunWorld::user();
        DB::table('progress_heads')->insert(['user_id' => $user->id, 'epoch' => 3, 'revision' => 0, 'created_at' => Instant::format(Instant::now()), 'updated_at' => Instant::format(Instant::now())]);
        Log::spy();

        $result = admit($user, submission());

        $run = $result->run;
        expect($result->created)->toBeTrue()
            ->and($run->status)->toBe(RunStatus::Queued)
            ->and($run->userId)->toBe($user->id)
            ->and($run->clientRunId)->toBe(FIRST_CLIENT_RUN_ID)
            ->and($run->epoch)->toBe(3)
            ->and($run->gradingHash)->toBe(hash('sha256', 'rust-01'))
            ->and($run->expectedTests)->toBe(['t1', 't2', 't3'])
            ->and($run->nonce)->toMatch('/\A[0-9a-f]{32}\z/')
            ->and($run->program)->toContain("__TALLER_END__{$run->nonce}:3")
            ->and($run->createdAt)->toEqual(Instant::parse(ADMISSION_NOW))
            ->and($run->expiresAt)->toEqual(Instant::parse(ADMISSION_NOW)->addSeconds(600))
            ->and($run->id)->toMatch('/\A[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}\z/');
        $job = DB::selectOne('select * from jobs');
        expect(DB::table('jobs')->count())->toBe(1)
            ->and($job->queue)->toBe('runs')
            ->and(str_contains($job->payload, $run->id))->toBeTrue();
        Log::shouldHaveReceived('info')->with('run.admitted', Mockery::any())->once();
        RunInvariants::assertClean();
    });

    it('creates the head of an account that has none', function () {
        $user = RunWorld::user();

        admit($user, submission());

        expect((int) DB::table('progress_heads')->where('user_id', $user->id)->value('epoch'))->toBe(1);
    });

    it('stores the code byte by byte', function (string $code) {
        $user = RunWorld::user();

        $result = admit($user, submission(code: $code));

        expect(DB::table('runs')->where('id', $result->run->id)->value('code'))->toBe($code)
            ->and($result->run->code)->toBe($code);
    })->with([
        'padded with CRLF' => ["\r\n  fn main() {}\t\r\n"],
        'with NUL bytes' => ["fn main() {}\0// end"],
        'not ASCII' => ['fn main() { println!("ñandú 🦀"); }'],
    ]);

    it('puts the reads of the exercise before the statement that takes the head of the account', function () {
        $user = RunWorld::user();
        $statements = [];
        DB::listen(function ($query) use (&$statements) {
            $statements[] = $query->sql;
        });

        admit($user, submission());

        $firstIndexOf = function (string $table) use ($statements): int {
            foreach ($statements as $index => $sql) {
                if (str_contains($sql, "`{$table}`")) {
                    return $index;
                }
            }
            throw new RuntimeException("No statement touches {$table}.");
        };
        $headIndex = $firstIndexOf('progress_heads');
        expect($firstIndexOf('exercises'))->toBeLessThan($headIndex)
            ->and($firstIndexOf('exercise_tests'))->toBeLessThan($headIndex)
            ->and($firstIndexOf('harness_templates'))->toBeLessThan($headIndex);
    });

    it('does not leave a run or a job when the database refuses the code', function () {
        $user = RunWorld::user();

        $failure = null;
        try {
            admit($user, submission(code: "fn main() {}\xFF"));
        } catch (RunWriteFailed $error) {
            $failure = $error;
        }

        expect($failure)->toBeInstanceOf(RunWriteFailed::class)
            ->and($failure->getMessage())->not->toContain('fn main')
            ->and($failure->getPrevious())->toBeNull();
        leavesNoTrace($user);
    });
});

describe('retries', function () {
    it('returns the same run, without a second job or any quota spent, even when the queue is full', function () {
        $user = RunWorld::user();
        $first = admit($user, submission(customTest: 'x == 1'));
        $other = RunWorld::user();
        foreach (range(1, 32) as $position) {
            RunWorld::run($other, ['status' => 'queued']);
        }
        $this->travelTo(Instant::parse(ADMISSION_NOW)->addSeconds(1));

        $again = admit($user, submission(customTest: 'x == 1'));

        expect($again->created)->toBeFalse()
            ->and($again->run->id)->toBe($first->run->id)
            ->and(DB::table('jobs')->count())->toBe(1)
            ->and(DB::table('runs')->where('user_id', $user->id)->count())->toBe(1);
    });

    it('returns the current state of a run that already finished', function () {
        $user = RunWorld::user();
        $first = admit($user, submission());
        DB::table('runs')->where('id', $first->run->id)->update(['status' => 'failed', 'program' => null, 'finished_at' => Instant::format(Instant::now()), 'expires_at' => null]);

        $again = admit($user, submission());

        expect($again->created)->toBeFalse()
            ->and($again->run->status)->toBe(RunStatus::Failed);
    });

    it('treats a blank or missing custom test as the same request', function (?string $first, ?string $second) {
        $user = RunWorld::user();
        $created = admit($user, submission(customTest: $first));

        $again = admit($user, submission(customTest: $second));

        expect($again->created)->toBeFalse()
            ->and($again->run->id)->toBe($created->run->id)
            ->and($created->run->customTest)->toBeNull();
    })->with([[null, ''], [null, " \t\r\n"], ['', null], [' ', '']]);

    it('stores a custom test without the whitespace around it', function () {
        $user = RunWorld::user();

        $result = admit($user, submission(customTest: "  x == 1 \n"));

        expect($result->run->customTest)->toBe('x == 1');
    });

    it('rejects the same client run id with another code, exercise or custom test', function (array $changes) {
        RunWorld::exercise('rust-02');
        $user = RunWorld::user();
        admit($user, submission(customTest: 'x == 1'));

        $rejection = rejectionOf($user, submission(
            code: $changes['code'] ?? 'fn main() {}',
            customTest: array_key_exists('customTest', $changes) ? $changes['customTest'] : 'x == 1',
            exerciseId: $changes['exerciseId'] ?? 'rust-01',
        ));

        expect($rejection->kind)->toBe(RejectionKind::ClientRunIdReused)
            ->and(DB::table('runs')->count())->toBe(1)
            ->and(DB::table('jobs')->count())->toBe(1);
    })->with([
        'other code' => [['code' => 'fn main() { }']],
        'other exercise' => [['exerciseId' => 'rust-02']],
        'other custom test' => [['customTest' => 'x == 2']],
        'no custom test' => [['customTest' => null]],
    ]);

    it('lets another account use the same client run id', function () {
        $first = RunWorld::user();
        $second = RunWorld::user();
        admit($first, submission());

        $result = admit($second, submission());

        expect($result->created)->toBeTrue()
            ->and(DB::table('runs')->count())->toBe(2);
    });

    it('creates a new run once the old one was pruned', function () {
        $user = RunWorld::user();
        $first = admit($user, submission());
        DB::table('runs')->where('id', $first->run->id)->delete();
        $this->travelTo(Instant::parse(ADMISSION_NOW)->addDays(15));

        $again = admit($user, submission());

        expect($again->created)->toBeTrue()
            ->and($again->run->id)->not->toBe($first->run->id);
    });

    it('answers account disabled to a retry before it finds the run', function () {
        $user = RunWorld::user();
        admit($user, submission());
        DB::table('users')->where('id', $user->id)->update(['status' => 'disabled']);

        expect(rejectionOf($user, submission())->kind)->toBe(RejectionKind::AccountDisabled);
    });
});

describe('rejects without leaving a trace', function () {
    it('an unknown or retired exercise', function (string $exerciseId) {
        RunWorld::exercise('rust-02');
        DB::table('exercises')->where('id', 'rust-02')->update(['status' => 'deprecated', 'retired_at' => now(), 'position' => null]);
        $user = RunWorld::user();

        $rejection = rejectionOf($user, submission(exerciseId: $exerciseId));

        expect($rejection->kind)->toBe(RejectionKind::UnknownExercise);
        leavesNoTrace($user);
    })->with(['unknown' => 'rust-99', 'retired' => 'rust-02']);

    it('a disabled or deleting account', function (string $state) {
        $user = User::factory()->{$state}()->create();

        $rejection = rejectionOf($user, submission());

        expect($rejection->kind)->toBe(RejectionKind::AccountDisabled);
        leavesNoTrace($user);
    })->with(['disabled', 'deleting']);

    it('an account with a run in progress', function () {
        $user = RunWorld::user();
        RunWorld::run($user, ['status' => 'running', 'started_at' => Instant::now()]);

        $rejection = rejectionOf($user, submission());

        expect($rejection->quota)->toBe(QuotaKind::Active)
            ->and($rejection->retryAfterSeconds)->toBe(3)
            ->and(DB::table('runs')->count())->toBe(1)
            ->and(DB::table('jobs')->count())->toBe(0)
            ->and(DB::table('progress_heads')->count())->toBe(0);
    });

    it('a full queue, counting only the queued runs of other accounts', function () {
        $user = RunWorld::user();
        foreach (range(1, 32) as $position) {
            RunWorld::run(RunWorld::user(), ['status' => 'queued']);
        }

        $rejection = rejectionOf($user, submission());

        expect($rejection->kind)->toBe(RejectionKind::QueueFull)
            ->and($rejection->retryAfterSeconds)->toBe(10);
        leavesNoTrace($user);
    });

    it('lets the 32nd run in', function () {
        $user = RunWorld::user();
        foreach (range(1, 31) as $position) {
            RunWorld::run(RunWorld::user(), ['status' => 'queued']);
        }

        expect(admit($user, submission())->created)->toBeTrue();
    });
});

describe('counts the quotas of the account', function () {
    it('lets a run in once the first one closed', function () {
        $user = RunWorld::user();
        $first = admit($user, submission());
        expect(rejectionOf($user, submission('0199f4a2-8e03-7c5a-b3d1-9a77c0de4f22'))->quota)->toBe(QuotaKind::Active);

        DB::table('runs')->where('id', $first->run->id)->update(['status' => 'passed', 'program' => null, 'finished_at' => Instant::format(Instant::now()), 'expires_at' => null]);

        expect(admit($user, submission('0199f4a2-8e03-7c5a-b3d1-9a77c0de4f22'))->created)->toBeTrue();
    });

    it('blocks the eleventh run in a minute and says when the oldest one leaves', function () {
        $user = RunWorld::user();
        foreach (range(1, 10) as $index) {
            closedRun($user, 'failed', Instant::now()->subSeconds(50));
        }

        $rejection = rejectionOf($user, submission());

        expect($rejection->quota)->toBe(QuotaKind::PerMinute)
            ->and($rejection->retryAfterSeconds)->toBe(10);
    });

    it('lets the tenth run of a minute in', function () {
        $user = RunWorld::user();
        foreach (range(1, 9) as $index) {
            closedRun($user, 'failed', Instant::now()->subSeconds(30));
        }

        expect(admit($user, submission())->created)->toBeTrue();
    });

    it('does not count an infra error, and counts a canceled run', function () {
        $user = RunWorld::user();
        foreach (range(1, 10) as $index) {
            closedRun($user, 'infra_error', Instant::now()->subSeconds(10));
        }
        expect(admit($user, submission())->created)->toBeTrue();
        DB::table('runs')->where('user_id', $user->id)->delete();

        foreach (range(1, 10) as $index) {
            closedRun($user, 'canceled', Instant::now()->subSeconds(10));
        }
        expect(rejectionOf($user, submission('0199f4a2-8e03-7c5a-b3d1-9a77c0de4f23'))->quota)->toBe(QuotaKind::PerMinute);
    });

    it('blocks past 300 runs in 24 hours and says when the oldest leaves', function () {
        $user = RunWorld::user();
        foreach (range(1, 300) as $index) {
            closedRun($user, 'passed', Instant::now()->subHours(23)->addSeconds($index));
        }

        $rejection = rejectionOf($user, submission());

        expect($rejection->quota)->toBe(QuotaKind::PerDay)
            ->and($rejection->retryAfterSeconds)->toBe(3601);
    });

    it('does not count a run that is older than 24 hours', function () {
        $user = RunWorld::user();
        foreach (range(1, 300) as $index) {
            closedRun($user, 'passed', Instant::now()->subHours(25));
        }

        expect(admit($user, submission())->created)->toBeTrue();
    });

    it('adds compile and run time of the runs that did not end in an infra error', function () {
        $user = RunWorld::user();
        closedRun($user, 'passed', Instant::now()->subHours(2), ['compile_ms' => 1_000_000, 'run_ms' => 500_000]);
        closedRun($user, 'infra_error', Instant::now()->subHours(1), ['compile_ms' => 9_000_000, 'run_ms' => 9_000_000]);
        closedRun($user, 'failed', Instant::now()->subHours(1), ['compile_ms' => 299_999, 'run_ms' => null]);
        expect(admit($user, submission())->created)->toBeTrue();
        DB::table('runs')->where('status', 'queued')->delete();
        DB::table('jobs')->delete();
        closedRun($user, 'timeout', Instant::now()->subMinutes(30), ['compile_ms' => 1, 'run_ms' => null]);

        $rejection = rejectionOf($user, submission('0199f4a2-8e03-7c5a-b3d1-9a77c0de4f24'));

        expect($rejection->quota)->toBe(QuotaKind::SandboxTime)
            ->and($rejection->retryAfterSeconds)->toBe(22 * 3600);
    });

    it('does not count the runs of another account', function () {
        $busy = RunWorld::user();
        foreach (range(1, 10) as $index) {
            closedRun($busy, 'failed', Instant::now()->subSeconds(10));
        }

        expect(admit(RunWorld::user(), submission())->created)->toBeTrue();
    });
});

describe('takes the account first', function () {
    it('reads the status of the account under a shared lock before it looks at the runs', function () {
        $user = RunWorld::user();
        $statements = [];
        DB::listen(function ($query) use (&$statements) {
            $statements[] = $query->sql;
        });

        admit($user, submission());

        $indexOf = function (string $needle) use ($statements): int {
            foreach ($statements as $index => $sql) {
                if (str_contains($sql, $needle)) {
                    return $index;
                }
            }
            throw new RuntimeException("No statement contains {$needle}.");
        };
        expect($indexOf('for update'))->toBeLessThan($indexOf('from `users`'))
            ->and($indexOf('from `users`'))->toBeLessThan($indexOf('from `runs`'));
    });
});
