<?php

use App\Progress\Snapshot\ProgressSnapshotReader;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Progress\Snapshot\SnapshotWorld;
use Tests\Support\ProgressWorld;

beforeEach(function () {
    SnapshotWorld::seedContent();
    $this->user = ProgressWorld::user();
    $this->reader = new ProgressSnapshotReader;
});

function sealsSnapshotInsert(int $userId, string $exerciseId, array $flags, int $revision): void
{
    DB::table('campaign_seals')->insert([
        'user_id' => $userId, 'exercise_id' => $exerciseId, 'code' => $flags[0], 'prediction' => $flags[1], 'assisted' => $flags[2],
        'imported_at' => SnapshotWorld::CLOCK, 'revision' => $revision,
    ]);
}

it('lists the seals ordered by exercise id, including the ones with the three flags off', function () {
    sealsSnapshotInsert($this->user->id, 'fx-rust-02', [0, 0, 0], 4);
    sealsSnapshotInsert($this->user->id, 'fx-go-01', [1, 0, 1], 7);
    sealsSnapshotInsert($this->user->id, 'fx-rust-01', [1, 1, 0], 5);

    expect($this->reader->areas($this->user->id, null)->toArray(true)['campaign']['seals'])->toBe([
        ['exerciseId' => 'fx-go-01', 'code' => true, 'prediction' => false, 'assisted' => true, 'revision' => 7],
        ['exerciseId' => 'fx-rust-01', 'code' => true, 'prediction' => true, 'assisted' => false, 'revision' => 5],
        ['exerciseId' => 'fx-rust-02', 'code' => false, 'prediction' => false, 'assisted' => false, 'revision' => 4],
    ]);
});

it('lists only the seals with a revision above the one given', function () {
    sealsSnapshotInsert($this->user->id, 'fx-go-01', [1, 0, 0], 4);
    sealsSnapshotInsert($this->user->id, 'fx-rust-01', [0, 1, 0], 5);
    sealsSnapshotInsert($this->user->id, 'fx-rust-02', [0, 0, 1], 6);

    $seals = $this->reader->areas($this->user->id, 4)->toArray(false)['campaign']['seals'];

    expect(array_column($seals, 'exerciseId'))->toBe(['fx-rust-01', 'fx-rust-02']);
});

it('does not show the seals of another account', function () {
    $other = ProgressWorld::user();
    sealsSnapshotInsert($other->id, 'fx-rust-01', [1, 1, 1], 3);
    sealsSnapshotInsert($this->user->id, 'fx-go-01', [1, 0, 0], 2);

    expect(array_column($this->reader->areas($this->user->id, null)->toArray(true)['campaign']['seals'], 'exerciseId'))->toBe(['fx-go-01']);
});
