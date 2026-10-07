<?php

use App\Progress\Snapshot\ProgressSnapshotReader;
use Tests\Feature\Progress\Snapshot\SnapshotWorld;
use Tests\Support\ProgressWorld;

beforeEach(function () {
    SnapshotWorld::seedContent();
    $this->user = ProgressWorld::user();
});

function legacyReviewOf(int $userId): ?array
{
    $exercises = (new ProgressSnapshotReader)->areas($userId, null)->toArray(true)['exercises'];

    return $exercises[0]['review'];
}

it('shows a review with only the due date when the confidence and the review time are missing', function () {
    SnapshotWorld::exerciseProgress($this->user, 'fx-rust-01', ['review_due_at' => '2026-10-09 00:00:00.000']);

    expect(legacyReviewOf($this->user->id))->toBe(['confidence' => null, 'reviewedAt' => null, 'reviewDueAt' => '2026-10-09T00:00:00.000Z', 'at' => null]);
});

it('shows no review when the confidence, the review time and the due date are all missing', function () {
    SnapshotWorld::exerciseProgress($this->user, 'fx-rust-01');

    expect(legacyReviewOf($this->user->id))->toBeNull();
});

it('shows the complete review group with its clock as before', function () {
    SnapshotWorld::exerciseProgress($this->user, 'fx-rust-01', [
        'confidence' => 'practice', 'reviewed_at' => '2026-10-06 00:00:00.000', 'review_due_at' => '2026-10-09 00:00:00.000', 'review_set_at' => SnapshotWorld::CLOCK,
    ]);

    expect(legacyReviewOf($this->user->id))->toBe([
        'confidence' => 'practice', 'reviewedAt' => '2026-10-06T00:00:00.000Z', 'reviewDueAt' => '2026-10-09T00:00:00.000Z', 'at' => SnapshotWorld::CLOCK_ISO,
    ]);
});

it('shows a review with only the review time', function () {
    SnapshotWorld::exerciseProgress($this->user, 'fx-rust-01', ['reviewed_at' => '2026-10-06 00:00:00.000']);

    expect(legacyReviewOf($this->user->id))->toBe(['confidence' => null, 'reviewedAt' => '2026-10-06T00:00:00.000Z', 'reviewDueAt' => null, 'at' => null]);
});
