<?php

use App\Models\User;
use App\Progress\ProgressTables;
use App\Progress\Reset\ProgressReset;
use App\Progress\Reset\ResetRequest;
use App\Progress\Sync\ClientOutdated;
use App\Progress\Sync\EpochMismatch;
use App\Runs\Record\Instant;
use App\Runs\Record\RunRow;
use App\Runs\RunStatus;
use Carbon\CarbonImmutable;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Monolog\Handler\TestHandler;
use Tests\Support\ProgressInvariants;
use Tests\Support\ProgressWorld;
use Tests\Support\RunInvariants;
use Tests\Support\RunWorld;

const RESET_NOW = '2026-10-07 12:00:00.000';

const RESET_TEXT_SENTINEL = 'zq9-centinela-reset-privado-7731';

const RESET_HISTORY_TABLES = ['attempts', 'attempt_tests', 'attempt_payloads', 'progress_imports', 'sync_operations'];

/** @return array<string, mixed> */
function resetWorld(): array
{
    return [
        'contentVersion' => '0123456789abcdef0123456789abcdef',
        'exercises' => [
            ['id' => 'fx-rust-01', 'language' => 'rust', 'hints' => 3, 'predictionOptions' => 3],
            ['id' => 'fx-go-01', 'language' => 'go', 'hints' => 3, 'predictionOptions' => 3],
        ],
        'worlds' => [['id' => 'fx-world-1', 'checkpointOptions' => 3]],
        'workshops' => [['id' => 'fx-workshop-1', 'predictionOptions' => 3, 'objectives' => ['fx-obj-1'], 'steps' => ['e1']]],
        'guide' => ['steps' => [['id' => 'fx-step-1', 'quizOptions' => 3]], 'resources' => []],
    ];
}

function resetPlantAccount(User $user, string $text = 'Aprendí'): void
{
    $at = ['revision' => 1, 'created_at' => RESET_NOW, 'updated_at' => RESET_NOW];
    $attemptId = DB::table('attempts')->insertGetId([
        'user_id' => $user->id, 'exercise_id' => 'fx-rust-01', 'epoch' => 1, 'legacy' => 1, 'outcome' => 'legacy_error', 'code_sha256' => hash('sha256', 'fn main() {}'),
        'attempted_at' => RESET_NOW, 'finished_at' => RESET_NOW, 'created_at' => RESET_NOW,
    ]);
    DB::table('attempt_tests')->insert(['attempt_id' => $attemptId, 'test_key' => 't1', 'exercise_id' => 'fx-rust-01', 'position' => 1, 'outcome' => 'pass']);
    DB::table('attempt_payloads')->insert(['attempt_id' => $attemptId, 'code' => 'fn main() {}', 'stdout' => '', 'stderr' => '', 'created_at' => RESET_NOW]);
    DB::table('sync_operations')->insert(['user_id' => $user->id, 'operation_id' => random_bytes(16), 'payload_sha256' => random_bytes(32), 'status' => 'applied', 'clock_offset_ms' => 0, 'received_at' => RESET_NOW]);
    DB::table('progress_imports')->insert([
        'user_id' => $user->id, 'import_id' => '01234567-89ab-cdef-0123-456789abcdef', 'source' => 'storage', 'raw_payload' => '{"v":1}', 'raw_sha256' => hash('sha256', '{"v":1}'),
        'report' => '{"written":{}}', 'epoch' => 1, 'revision' => 1, 'imported_at' => RESET_NOW,
    ]);
    DB::table('exercise_progress')->insert([
        'user_id' => $user->id, 'exercise_id' => 'fx-rust-01', 'proof_attempt_id' => $attemptId, 'proof_at' => RESET_NOW,
        'last_attempt_id' => $attemptId, 'last_attempt_at' => RESET_NOW, ...$at,
    ]);
    DB::table('drafts')->insert(['user_id' => $user->id, 'exercise_id' => 'fx-rust-01', 'code' => $text, ...$at]);
    DB::table('campaign_checkpoints')->insert(['user_id' => $user->id, 'world_id' => 'fx-world-1', ...$at]);
    DB::table('workshop_progress')->insert(['user_id' => $user->id, 'workshop_id' => 'fx-workshop-1', 'language' => 'rust', ...$at]);
    DB::table('workshop_observations')->insert(['user_id' => $user->id, 'workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'objective_key' => 'fx-obj-1', 'revision' => 1, 'created_at' => RESET_NOW]);
    DB::table('workshop_step_marks')->insert(['user_id' => $user->id, 'workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'step_key' => 'e1', 'marked' => 1, ...$at]);
    DB::table('route_marks')->insert(['user_id' => $user->id, 'kind' => 'step', 'item_key' => 'fx-step-1', 'marked' => 1, ...$at]);
    DB::table('route_quiz_answers')->insert(['user_id' => $user->id, 'step_id' => 'fx-step-1', 'answer' => 1, ...$at]);
    DB::table('route_notes')->insert(['user_id' => $user->id, 'language' => 'rust', 'field' => 'learned', 'body' => $text, ...$at]);
    DB::table('preferences')->insert(['user_id' => $user->id, 'lab_selected_rust' => 'fx-rust-01', 'lab_selected_go' => 'fx-go-01', ...$at]);
    DB::table('campaign_seals')->insert(['user_id' => $user->id, 'exercise_id' => 'fx-rust-01', 'code' => 1, 'prediction' => 0, 'assisted' => 1, 'imported_at' => RESET_NOW, 'revision' => 1]);
}

/** @return array<string, int> */
function resetRowCounts(User $user): array
{
    $counts = [];
    foreach (ProgressTables::STATE as $table) {
        $counts[$table] = DB::table($table)->where('user_id', $user->id)->count();
    }
    foreach (RESET_HISTORY_TABLES as $table) {
        $counts[$table] = in_array($table, ['attempt_tests', 'attempt_payloads'], true)
            ? DB::table($table)->whereIn('attempt_id', DB::table('attempts')->where('user_id', $user->id)->select('id'))->count()
            : DB::table($table)->where('user_id', $user->id)->count();
    }

    return $counts;
}

function resetRequest(int $epoch = 1, int $format = 2): ResetRequest
{
    return new ResetRequest($epoch, $format);
}

function resetStoredRun(string $runId): RunRow
{
    return RunRow::fromRow((array) DB::selectOne('select * from runs where id = ?', [$runId]));
}

beforeEach(function () {
    ProgressWorld::seed(resetWorld());
    $this->user = ProgressWorld::user();
    $this->other = ProgressWorld::user();
    ProgressWorld::head($this->user, epoch: 1, revision: 5);
    ProgressWorld::head($this->other, epoch: 1, revision: 5);
    resetPlantAccount($this->user);
    resetPlantAccount($this->other);
    $this->travelTo(CarbonImmutable::parse(RESET_NOW, 'UTC'));
});

describe('a request that changes nothing', function () {
    it('answers EpochMismatch with the current epoch and revision when the epoch is not the current one', function () {
        $before = resetRowCounts($this->user);

        try {
            app(ProgressReset::class)->reset($this->user->id, resetRequest(epoch: 2));
            $thrown = null;
        } catch (EpochMismatch $mismatch) {
            $thrown = $mismatch;
        }

        $head = DB::table('progress_heads')->where('user_id', $this->user->id)->first();
        expect($thrown)->toBeInstanceOf(EpochMismatch::class)
            ->and([$thrown->epoch, $thrown->revision])->toBe([1, 5])
            ->and([$head->epoch, $head->revision, $head->reset_at])->toBe([1, 5, null])
            ->and(resetRowCounts($this->user))->toBe($before);
    });

    it('answers ClientOutdated for a format the server does not accept and keeps every row', function (int $format) {
        $before = resetRowCounts($this->user);

        expect(fn () => app(ProgressReset::class)->reset($this->user->id, resetRequest(format: $format)))->toThrow(ClientOutdated::class)
            ->and(resetRowCounts($this->user))->toBe($before)
            ->and(DB::table('progress_heads')->where('user_id', $this->user->id)->value('epoch'))->toBe(1);
    })->with([1, 3, 0]);
});

describe('the reset', function () {
    it('moves the head one epoch and one revision forward and stamps the reset and the last activity with now', function () {
        app(ProgressReset::class)->reset($this->user->id, resetRequest());

        $head = DB::table('progress_heads')->where('user_id', $this->user->id)->first();
        expect([$head->epoch, $head->revision])->toBe([2, 6])
            ->and($head->reset_at)->toBe(RESET_NOW)
            ->and($head->last_activity_at)->toBe(RESET_NOW);
    });

    it('leaves the eleven state tables of the account without rows', function () {
        app(ProgressReset::class)->reset($this->user->id, resetRequest());

        expect(Arr::only(resetRowCounts($this->user), ProgressTables::STATE))->toBe(array_fill_keys(ProgressTables::STATE, 0));
    });

    it('keeps the other account, the attempts and their tests and payloads, the imports, the sync operations, the account and its sessions', function () {
        DB::table('sessions')->insert(['id' => 'reset-session', 'user_id' => $this->user->id, 'payload' => '', 'last_activity' => 1]);
        $otherBefore = resetRowCounts($this->other);

        app(ProgressReset::class)->reset($this->user->id, resetRequest());

        $counts = resetRowCounts($this->user);
        expect(resetRowCounts($this->other))->toBe($otherBefore)
            ->and(collect(RESET_HISTORY_TABLES)->map(fn (string $table) => $counts[$table])->all())->toBe([1, 1, 1, 1, 1])
            ->and(DB::table('users')->where('id', $this->user->id)->count())->toBe(1)
            ->and(DB::table('sessions')->where('user_id', $this->user->id)->count())->toBe(1)
            ->and(DB::table('progress_heads')->where('user_id', $this->other->id)->value('epoch'))->toBe(1);
    });

    it('reports the epoch, the revision and the rows it deleted from each table', function () {
        DB::table('route_marks')->insert(['user_id' => $this->user->id, 'kind' => 'step', 'item_key' => 'fx-step-2', 'marked' => 1, 'revision' => 1, 'created_at' => RESET_NOW, 'updated_at' => RESET_NOW]);

        $outcome = app(ProgressReset::class)->reset($this->user->id, resetRequest());

        expect($outcome->epoch)->toBe(2)
            ->and($outcome->revision)->toBe(6)
            ->and($outcome->toArray())->toBe(['epoch' => 2, 'revision' => 6])
            ->and($outcome->deleted)->toBe([
                'campaign_seals' => 1, 'preferences' => 1, 'route_notes' => 1, 'route_quiz_answers' => 1, 'route_marks' => 2,
                'workshop_step_marks' => 1, 'workshop_observations' => 1, 'workshop_progress' => 1, 'campaign_checkpoints' => 1,
                'drafts' => 1, 'exercise_progress' => 1,
            ]);
    });

    it('creates the head of an account that never had one, in epoch 2 and revision 1', function () {
        $fresh = ProgressWorld::user();

        $outcome = app(ProgressReset::class)->reset($fresh->id, resetRequest());

        $head = DB::table('progress_heads')->where('user_id', $fresh->id)->first();
        expect([$outcome->epoch, $outcome->revision])->toBe([2, 1])
            ->and([$head->epoch, $head->revision, $head->reset_at])->toBe([2, 1, RESET_NOW]);
    });

    it('leaves the invariants clean', function () {
        app(ProgressReset::class)->reset($this->user->id, resetRequest());

        ProgressInvariants::assertClean();
        RunInvariants::assertClean();
    });
});

describe('the active runs', function () {
    it('cancels the queued run with no reason and asks to cancel the running one, keeping the other account untouched', function () {
        $queued = RunWorld::run($this->user, ['exercise_id' => 'fx-rust-01']);
        $running = RunWorld::run($this->user, ['exercise_id' => 'fx-rust-01', 'status' => 'running', 'started_at' => Instant::now()]);
        $others = RunWorld::run($this->other, ['exercise_id' => 'fx-rust-01']);

        app(ProgressReset::class)->reset($this->user->id, resetRequest());

        $storedQueued = resetStoredRun($queued->id);
        $attempt = DB::table('attempts')->where('id', $storedQueued->attemptId)->first();
        expect($storedQueued->status)->toBe(RunStatus::Canceled)
            ->and($storedQueued->reason)->toBeNull()
            ->and([$attempt->outcome, $attempt->epoch, $attempt->reason])->toBe(['canceled', 1, null])
            ->and(resetStoredRun($running->id)->cancelRequestedAt)->not->toBeNull()
            ->and(resetStoredRun($others->id)->status)->toBe(RunStatus::Queued);
        RunInvariants::assertClean();
    });

    it('runs the cancellations after the commit: the deletes of the state come before the first statement on runs', function () {
        RunWorld::run($this->user, ['exercise_id' => 'fx-rust-01']);
        DB::flushQueryListeners();
        DB::enableQueryLog();

        app(ProgressReset::class)->reset($this->user->id, resetRequest());

        $statements = collect(DB::getQueryLog())->pluck('query')->map(fn (string $sql) => strtolower($sql))->values();
        $lastStateDelete = $statements->keys()->filter(fn (int $index) => str_starts_with($statements[$index], 'delete from `exercise_progress`'))->last();
        $firstOnRuns = $statements->keys()->first(fn (int $index) => str_contains($statements[$index], '`runs`'));
        expect($lastStateDelete)->not->toBeNull()
            ->and($firstOnRuns)->toBeGreaterThan($lastStateDelete);
    });

    it('logs progress.reset.cancel_failed and still returns its outcome when the cancellation throws', function () {
        config(['logging.default' => 'stderr']);
        $handler = new TestHandler;
        Log::channel('stderr')->getLogger()->setHandlers([$handler]);
        RunWorld::run($this->user, ['exercise_id' => 'fx-rust-01']);
        DB::beforeExecuting(function (string $query) {
            if (str_contains($query, 'from `runs`')) {
                throw new RuntimeException('runs unavailable');
            }
        });

        $outcome = app(ProgressReset::class)->reset($this->user->id, resetRequest());

        $messages = collect($handler->getRecords())->pluck('message')->all();
        expect($outcome->epoch)->toBe(2)
            ->and($messages)->toContain('progress.reset.cancel_failed')
            ->and(DB::table('progress_heads')->where('user_id', $this->user->id)->value('epoch'))->toBe(2);
    });
});

describe('the records', function () {
    beforeEach(function () {
        config(['logging.default' => 'stderr']);
        $this->handler = new TestHandler;
        Log::channel('stderr')->getLogger()->setHandlers([$this->handler]);
    });

    it('writes one progress.reset line with the account, the epoch, the revision and the counts', function () {
        RunWorld::run($this->user, ['exercise_id' => 'fx-rust-01']);
        $this->handler->clear();

        app(ProgressReset::class)->reset($this->user->id, resetRequest());

        $records = collect($this->handler->getRecords())->where('message', 'progress.reset')->values();
        expect($records)->toHaveCount(1)
            ->and($records[0]->context)->toMatchArray(['user_id' => $this->user->id, 'epoch' => 2, 'revision' => 6, 'canceled_runs' => 1])
            ->and($records[0]->context['deleted'])->toMatchArray(['drafts' => 1, 'route_notes' => 1, 'exercise_progress' => 1]);
    });

    it('keeps the text of the account out of every record', function () {
        DB::table('drafts')->where('user_id', $this->user->id)->update(['code' => RESET_TEXT_SENTINEL]);
        DB::table('route_notes')->where('user_id', $this->user->id)->update(['body' => RESET_TEXT_SENTINEL]);
        $this->handler->clear();

        app(ProgressReset::class)->reset($this->user->id, resetRequest());

        $rendered = collect($this->handler->getRecords())->map(fn ($record) => json_encode([$record->message, $record->context, $record->extra], JSON_PARTIAL_OUTPUT_ON_ERROR))->implode("\n");
        expect($rendered)->toContain('progress.reset')->and($rendered)->not->toContain('zq9-centinela');
    });
});
