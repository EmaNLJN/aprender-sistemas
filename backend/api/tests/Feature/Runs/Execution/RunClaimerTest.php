<?php

use App\Runs\Execution\ClaimOutcome;
use App\Runs\Execution\RunClaimer;
use App\Runs\Record\Instant;
use App\Runs\Record\RunRow;
use App\Runs\RunReason;
use App\Runs\RunStatus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Tests\Support\RunInvariants;
use Tests\Support\RunWorld;

const CLAIM_ACCEPTED = '2026-10-05 12:00:00.000';
const CLAIM_NOW = '2026-10-05 12:00:30.500';

function claimQueued(array $userState = [], array $overrides = []): RunRow
{
    test()->travelTo(Instant::parse(CLAIM_ACCEPTED));
    $run = RunWorld::run(RunWorld::user($userState), $overrides);
    test()->travelTo(Instant::parse(CLAIM_NOW));

    return $run;
}

function claimStoredRun(string $runId): RunRow
{
    return RunRow::fromRow((array) DB::selectOne('select * from runs where id = ?', [$runId]));
}

it('claims a queued run: running, started now, expiring 140 seconds later, with its program', function () {
    $run = claimQueued();
    Log::spy();

    $claim = app(RunClaimer::class)->claim($run->id);

    expect($claim->outcome)->toBe(ClaimOutcome::Ready)
        ->and($claim->run?->status)->toBe(RunStatus::Running)
        ->and($claim->run?->program)->toBe('fn main() {}')
        ->and($claim->run?->startedAt)->toEqual(Instant::parse(CLAIM_NOW))
        ->and($claim->run?->expiresAt)->toEqual(Instant::parse('2026-10-05 12:02:50.500'))
        ->and(claimStoredRun($run->id)->status)->toBe(RunStatus::Running)
        ->and(DB::table('attempts')->count())->toBe(0);
    Log::shouldHaveReceived('info')->with('run.claimed', Mockery::on(fn (array $context) => $context['run_id'] === $run->id))->once();
    RunInvariants::assertClean();
});

it('discards a run that is no longer queued without writing anything', function (string $status) {
    $run = claimQueued([], ['status' => $status, 'started_at' => Instant::parse(CLAIM_ACCEPTED), 'finished_at' => in_array($status, ['queued', 'running'], true) ? null : Instant::parse(CLAIM_ACCEPTED)]);
    Log::spy();

    $claim = app(RunClaimer::class)->claim($run->id);

    expect($claim->outcome)->toBe(ClaimOutcome::Discard)
        ->and($claim->run)->toBeNull()
        ->and(claimStoredRun($run->id)->startedAt)->toEqual(Instant::parse(CLAIM_ACCEPTED))
        ->and(claimStoredRun($run->id)->status->value)->toBe($status);
    Log::shouldNotHaveReceived('info');
})->with(['running', 'infra_error']);

it('discards a run that does not exist', function () {
    expect(app(RunClaimer::class)->claim('01990000-0000-7000-8000-000000000000')->outcome)->toBe(ClaimOutcome::Discard);
});

it('closes an expired queued run as infra_error expired, with its attempt', function () {
    $run = claimQueued([], ['expires_at' => Instant::parse('2026-10-05 12:00:10.000')]);
    Log::spy();

    $claim = app(RunClaimer::class)->claim($run->id);

    $stored = claimStoredRun($run->id);
    expect($claim->outcome)->toBe(ClaimOutcome::Closed)
        ->and($claim->verdict?->status)->toBe(RunStatus::InfraError)
        ->and($stored->status)->toBe(RunStatus::InfraError)
        ->and($stored->reason)->toBe(RunReason::Expired)
        ->and($stored->attemptId)->not->toBeNull()
        ->and(DB::table('attempts')->count())->toBe(1);
    Log::shouldHaveReceived('info')->with('run.closed', Mockery::any())->once();
    RunInvariants::assertClean();
});

it('closes the run of an account that is not active as canceled with account_disabled, uncounted', function (string $status) {
    $run = claimQueued(['status' => $status]);

    $claim = app(RunClaimer::class)->claim($run->id);

    $stored = claimStoredRun($run->id);
    expect($claim->outcome)->toBe(ClaimOutcome::Closed)
        ->and($stored->status)->toBe(RunStatus::Canceled)
        ->and($stored->reason)->toBe(RunReason::AccountDisabled)
        ->and(DB::table('attempts')->value('counted'))->toBe(0)
        ->and(DB::table('exercise_progress')->count())->toBe(0);
    RunInvariants::assertClean();
})->with(['disabled', 'deleting']);

it('discards, without an exception, a run whose account was deleted between the read and the lock', function () {
    test()->travelTo(Instant::parse(CLAIM_NOW));
    $run = RunWorld::orphanRun(RunWorld::user());

    expect(app(RunClaimer::class)->claim($run->id)->outcome)->toBe(ClaimOutcome::Discard);
});
