<?php

use App\Progress\AccountLock;
use App\Progress\ChangesReader;
use App\Runs\Evidence\TestVerdict;
use App\Runs\Evidence\Verdict;
use App\Runs\Execution\RunCloser;
use App\Runs\ExecutorPhase;
use App\Runs\Record\Instant;
use App\Runs\RunStatus;
use App\Runs\TestOutcome;
use Illuminate\Support\Facades\DB;
use Tests\Support\MergeFixture;
use Tests\Support\Parallel;
use Tests\Support\ProgressInvariants;
use Tests\Support\ProgressWorld;
use Tests\Support\RunWorld;
use Tests\Support\Sync\Ops;
use Tests\Support\Sync\SyncCall;

beforeEach(function () {
    ProgressWorld::seed(MergeFixture::world());
    $this->user = ProgressWorld::user();
});

function recentAt(): string
{
    return Instant::iso(Instant::now()->subSeconds(30));
}

it('applies the same batch once when twenty processes send it at the same time', function () {
    $batch = [Ops::reflection(1, 'una sola vez', recentAt()), Ops::customTest(2, 'también', recentAt())];
    $userId = $this->user->id;
    $startAt = SyncCall::startIn(4);

    $senders = [];
    foreach (range(1, 20) as $sender) {
        $senders[] = fn (): array => SyncCall::run($userId, $batch, 0, $startAt);
    }
    $results = Parallel::run($senders);

    $statusesByProcess = array_map(fn (array $result) => implode(',', $result['statuses']), $results);
    expect(array_count_values($statusesByProcess))->toEqual(['applied,applied' => 1, 'duplicate,duplicate' => 19])
        ->and(array_values(array_unique(array_column($results, 'revision'))))->toBe([1])
        ->and((int) DB::table('progress_heads')->where('user_id', $userId)->value('revision'))->toBe(1)
        ->and(DB::table('sync_operations')->where('user_id', $userId)->count())->toBe(2)
        ->and(DB::table('exercise_progress')->where('user_id', $userId)->value('revision'))->toBe(1);
    ProgressInvariants::assertClean($userId);
});

it('serializes two different batches of one account into the next two revisions, with both edits at the end', function () {
    $userId = $this->user->id;
    SyncCall::run($userId, [Ops::workshopNote(9, 'previa', recentAt())]);
    $first = [Ops::reflection(1, 'del primer lote', recentAt())];
    $second = [Ops::customTest(2, 'del segundo lote', recentAt())];
    $startAt = SyncCall::startIn(3);

    $results = Parallel::run([
        fn (): array => SyncCall::run($userId, $first, 0, $startAt),
        fn (): array => SyncCall::run($userId, $second, 0, $startAt),
    ]);

    $revisions = array_column($results, 'revision');
    sort($revisions);
    $row = DB::table('exercise_progress')->where('user_id', $userId)->first();
    expect($revisions)->toBe([2, 3])
        ->and([$row->reflection, $row->custom_test])->toBe(['del primer lote', 'del segundo lote'])
        ->and((int) DB::table('progress_heads')->where('user_id', $userId)->value('revision'))->toBe(3);
    ProgressInvariants::assertClean($userId);
});

it('serializes a batch against the close of a run without a deadlock and delivers both in the delta', function () {
    $userId = $this->user->id;
    $known = SyncCall::run($userId, [Ops::workshopNote(9, 'previa', recentAt())])['revision'];
    $run = RunWorld::run($this->user, ['exercise_id' => 'fx-rust-01', 'status' => 'running', 'started_at' => Instant::now()]);
    $verdict = new Verdict(
        RunStatus::Passed, null, ExecutorPhase::Run, 0, false, 10, 10, 'ok', '',
        [new TestVerdict('t1', TestOutcome::Pass), new TestVerdict('t2', TestOutcome::Pass), new TestVerdict('t3', TestOutcome::Pass)], null,
    );
    $batch = [Ops::reflection(1, 'durante el cierre', recentAt())];
    $startAt = SyncCall::startIn(3);

    $results = Parallel::run([
        'sync' => fn (): array => SyncCall::run($userId, $batch, $known, $startAt),
        'close' => function () use ($run, $verdict, $startAt): bool {
            SyncCall::waitUntil($startAt);

            return app(RunCloser::class)->close($run->id, $verdict);
        },
    ]);

    $exercises = app(ChangesReader::class)->areas($userId, $known)->toArray(false)['exercises'];
    expect($results['sync']['statuses'])->toBe(['applied'])
        ->and($results['close'])->toBeTrue()
        ->and($exercises)->toHaveCount(1)
        ->and($exercises[0]['reflection']['text'])->toBe('durante el cierre')
        ->and($exercises[0]['attemptCount'])->toBe(1)
        ->and($exercises[0]['proof']['state'])->toBe('current')
        ->and((int) DB::table('progress_heads')->where('user_id', $userId)->value('revision'))->toBe($known + 2)
        ->and($exercises[0]['revision'])->toBe($known + 2);
    ProgressInvariants::assertClean($userId);
});

it('does not make the sync of one account wait for the lock of another', function () {
    $accountA = $this->user->id;
    $accountB = ProgressWorld::user()->id;
    $batch = [Ops::reflection(1, 'de la cuenta B', recentAt())];

    $results = Parallel::run([
        'holder' => function () use ($accountA): bool {
            return (new AccountLock)->within($accountA, function () {
                DB::build(config('database.connections.'.config('database.default')))->table('cache')->insert(['key' => 'a-holding', 'value' => '1', 'expiration' => 2000000000]);
                $deadline = microtime(true) + 20;
                while (microtime(true) < $deadline) {
                    if (DB::build(config('database.connections.'.config('database.default')))->table('cache')->where('key', 'b-done')->exists()) {
                        return true;
                    }
                    usleep(50000);
                }

                return false;
            });
        },
        'other' => function () use ($accountB, $batch): bool {
            $deadline = microtime(true) + 20;
            while (! DB::table('cache')->where('key', 'a-holding')->exists()) {
                if (microtime(true) > $deadline) {
                    return false;
                }
                usleep(50000);
            }
            SyncCall::run($accountB, $batch);
            DB::table('cache')->insert(['key' => 'b-done', 'value' => '1', 'expiration' => 2000000000]);

            return true;
        },
    ]);

    expect($results)->toBe(['holder' => true, 'other' => true])
        ->and((int) DB::table('progress_heads')->where('user_id', $accountB)->value('revision'))->toBe(1);
});
