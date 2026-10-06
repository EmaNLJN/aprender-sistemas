<?php

use App\Runs\Execution\RunStore;
use App\Runs\RunStatus;
use Illuminate\Support\Facades\DB;
use Tests\Support\RunWorld;

it('names the owner of a run without taking a lock', function () {
    $user = RunWorld::user();
    $run = RunWorld::run($user);

    expect((new RunStore)->ownerOf($run->id))->toBe($user->id);
});

it('has no owner for a run that does not exist', function () {
    expect((new RunStore)->ownerOf('01990000-0000-7000-8000-000000000000'))->toBeNull();
});

it('reads a run for update as a typed row', function () {
    $run = RunWorld::run(RunWorld::user(), ['status' => 'running', 'started_at' => now()->toImmutable()]);

    $locked = DB::transaction(fn () => (new RunStore)->locked($run->id));

    expect($locked?->id)->toBe($run->id)
        ->and($locked?->status)->toBe(RunStatus::Running)
        ->and($locked?->expectedTests)->toBe(['t1', 't2', 't3'])
        ->and($locked?->createdAt)->toEqual($run->createdAt);
});

it('has no row to lock for a run that does not exist', function () {
    expect(DB::transaction(fn () => (new RunStore)->locked('01990000-0000-7000-8000-000000000000')))->toBeNull();
});
