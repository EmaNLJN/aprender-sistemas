<?php

use App\Progress\AccountLock;
use App\Progress\Snapshot\ProgressSnapshotReader;
use App\Progress\Snapshot\Snapshot;
use App\Runs\Record\Instant;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Progress\Snapshot\SnapshotWorld;
use Tests\Support\Parallel;
use Tests\Support\ProgressWorld;

it('does not show a batch that commits between the read of the head and the read of the tables', function () {
    SnapshotWorld::seedContent();
    $user = ProgressWorld::user();
    ProgressWorld::head($user, 1, 5);
    SnapshotWorld::exerciseProgress($user, 'fx-rust-01', ['revision' => 5]);

    $writer = function () use ($user): void {
        (new AccountLock)->within($user->id, function ($head) use ($user) {
            $advanced = (new AccountLock)->advance($head, Instant::now());
            SnapshotWorld::exerciseProgress($user, 'fx-rust-02', ['revision' => $advanced->revision]);
        });
    };
    $snapshot = (new ProgressSnapshotReader)->read($user->id, SnapshotWorld::CONTENT_VERSION, function (string $etag) use ($writer) {
        Parallel::run([$writer]);

        return false;
    });

    assert($snapshot instanceof Snapshot);
    expect(DB::table('progress_heads')->where('user_id', $user->id)->value('revision'))->toBe(6)
        ->and($snapshot->revision)->toBe(5)
        ->and(array_column($snapshot->areas->exercises, 'exerciseId'))->toBe(['fx-rust-01']);
});

it('refuses to write inside the read, because its transaction is read only', function () {
    SnapshotWorld::seedContent();
    $user = ProgressWorld::user();

    $attempt = fn () => (new ProgressSnapshotReader)->read($user->id, SnapshotWorld::CONTENT_VERSION, function (string $etag) use ($user) {
        DB::table('progress_heads')->insert(['user_id' => $user->id, 'epoch' => 1, 'revision' => 0, 'created_at' => SnapshotWorld::CLOCK, 'updated_at' => SnapshotWorld::CLOCK]);

        return false;
    });

    expect($attempt)->toThrow(QueryException::class, 'READ ONLY');
});
