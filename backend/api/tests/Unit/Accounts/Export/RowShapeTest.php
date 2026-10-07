<?php

use App\Accounts\Export\RowShape;

it('renames columns to camelCase, formats date columns as ISO 8601 UTC and drops the excluded ones', function () {
    $shaped = RowShape::of(
        ['exercise_id' => 'rust-01', 'solved_at' => '2026-10-06 12:00:00.123', 'attempt_count' => 2, 'user_id' => 7],
        ['solved_at'],
        ['user_id'],
    );

    expect($shaped)->toBe(['exerciseId' => 'rust-01', 'solvedAt' => '2026-10-06T12:00:00.123Z', 'attemptCount' => 2]);
});

it('keeps a NULL date as null and renames a multiword date column', function () {
    $shaped = RowShape::of(
        ['custom_test_set_at' => null, 'reviewed_at' => '2026-10-07 01:02:03.000'],
        ['custom_test_set_at', 'reviewed_at'],
        [],
    );

    expect($shaped)->toBe(['customTestSetAt' => null, 'reviewedAt' => '2026-10-07T01:02:03.000Z']);
});

it('leaves non date values exactly as they come', function () {
    $shaped = RowShape::of(['assisted' => 1, 'reflection' => '2026-10-06 12:00:00.123'], ['solved_at'], []);

    expect($shaped)->toBe(['assisted' => 1, 'reflection' => '2026-10-06 12:00:00.123']);
});
