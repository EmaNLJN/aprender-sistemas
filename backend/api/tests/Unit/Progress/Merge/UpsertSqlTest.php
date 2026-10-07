<?php

use App\Progress\Merge\FieldWrite;
use App\Progress\Merge\UpsertSql;
use App\Progress\Operations\FieldKinds;
use Carbon\CarbonImmutable;

function upsertNow(): CarbonImmutable
{
    return CarbonImmutable::parse('2026-10-05T12:00:00.123Z');
}

function upsertAt(): CarbonImmutable
{
    return CarbonImmutable::parse('2026-10-05T11:59:00.500Z');
}

/** @param list<string|int|null> $values */
function fieldWrite(string $kind, array $values, bool $withClock = true): FieldWrite
{
    return new FieldWrite(FieldKinds::definition($kind), $values, $withClock ? upsertAt() : null);
}

function overwriteAssignments(string $sql): string
{
    return substr($sql, (int) strpos($sql, 'ON DUPLICATE KEY UPDATE'));
}

it('writes a reflection as one lww group with its exact statement and bindings', function () {
    $table = '`exercise_progress`';
    $clock = '`reflection_set_at`';
    $wins = "{$table}.{$clock} IS NULL OR (`n`.{$clock} IS NOT NULL AND `n`.{$clock} >= {$table}.{$clock})";
    $same = "CAST({$table}.`reflection` AS BINARY) <=> CAST(`n`.`reflection` AS BINARY) AND {$table}.{$clock} <=> `n`.{$clock}";
    $changes = "({$wins}) AND NOT ({$same})";

    $statement = UpsertSql::row(7, ['exercise_id' => 'fx-rust-01'], [fieldWrite('exercise.reflection', ['Hola'])], 43, upsertNow());

    expect($statement->sql)->toBe(implode(' ', [
        'INSERT INTO `exercise_progress`',
        '(`user_id`, `exercise_id`, `reflection`, `reflection_set_at`, `revision`, `created_at`, `updated_at`)',
        'VALUES (?, ?, ?, ?, ?, ?, ?) AS `n`',
        'ON DUPLICATE KEY UPDATE',
        "`revision` = IF({$changes}, `n`.`revision`, {$table}.`revision`),",
        "`updated_at` = IF({$changes}, `n`.`updated_at`, {$table}.`updated_at`),",
        "`reflection` = IF({$wins}, `n`.`reflection`, {$table}.`reflection`),",
        "`reflection_set_at` = IF({$wins}, `n`.`reflection_set_at`, {$table}.`reflection_set_at`)",
    ]))->and($statement->bindings)->toBe([
        7, 'fx-rust-01', 'Hola', '2026-10-05 11:59:00.500', 43, '2026-10-05 12:00:00.123', '2026-10-05 12:00:00.123',
    ]);
});

it('writes the answer and the flag of a prediction in one statement', function () {
    $table = '`exercise_progress`';
    $answerClock = '`prediction_answer_set_at`';
    $answerWins = "{$table}.{$answerClock} IS NULL OR (`n`.{$answerClock} IS NOT NULL AND `n`.{$answerClock} >= {$table}.{$answerClock})";
    $answerChanges = "({$answerWins}) AND NOT ({$table}.`prediction_answer` <=> `n`.`prediction_answer` AND {$table}.{$answerClock} <=> `n`.{$answerClock})";
    $date = '`prediction_correct_at`';
    $flag = '`prediction_correct`';
    $flagChanges = implode(' ', [
        "`n`.{$flag} = 1 AND ({$table}.{$flag} = 0",
        "OR ({$table}.{$date} IS NULL AND `n`.{$date} IS NOT NULL)",
        "OR (`n`.{$date} IS NOT NULL AND `n`.{$date} < {$table}.{$date}))",
    ]);
    $guard = "({$answerChanges}) OR ({$flagChanges})";

    $statement = UpsertSql::row(
        7,
        ['exercise_id' => 'fx-rust-01'],
        [fieldWrite('exercise.prediction.answer', [1]), fieldWrite('exercise.predictionCorrect', [1])],
        43,
        upsertNow(),
    );

    expect($statement->sql)->toBe(implode(' ', [
        'INSERT INTO `exercise_progress`',
        '(`user_id`, `exercise_id`, `prediction_answer`, `prediction_answer_set_at`, `prediction_correct`, `prediction_correct_at`, `revision`, `created_at`, `updated_at`)',
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) AS `n`',
        'ON DUPLICATE KEY UPDATE',
        "`revision` = IF({$guard}, `n`.`revision`, {$table}.`revision`),",
        "`updated_at` = IF({$guard}, `n`.`updated_at`, {$table}.`updated_at`),",
        "`prediction_answer` = IF({$answerWins}, `n`.`prediction_answer`, {$table}.`prediction_answer`),",
        "`prediction_answer_set_at` = IF({$answerWins}, `n`.`prediction_answer_set_at`, {$table}.`prediction_answer_set_at`),",
        "{$date} = IF(`n`.{$flag} = 1, LEAST(COALESCE({$table}.{$date}, `n`.{$date}), COALESCE(`n`.{$date}, {$table}.{$date})), {$table}.{$date}),",
        "{$flag} = IF(`n`.{$flag} = 1, 1, {$table}.{$flag})",
    ]))->and($statement->bindings)->toBe([
        7, 'fx-rust-01', 1, '2026-10-05 11:59:00.500', 1, '2026-10-05 11:59:00.500', 43, '2026-10-05 12:00:00.123', '2026-10-05 12:00:00.123',
    ]);
});

it('leaves the flag out of the statement when the operation does not grant it', function () {
    $statement = UpsertSql::row(7, ['exercise_id' => 'fx-rust-01'], [fieldWrite('exercise.prediction.answer', [2])], 43, upsertNow());

    expect($statement->sql)->not->toContain('prediction_correct')
        ->and($statement->sql)->toStartWith('INSERT INTO `exercise_progress` (`user_id`, `exercise_id`, `prediction_answer`, `prediction_answer_set_at`, `revision`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?, ?, ?, ?) AS `n`')
        ->and($statement->bindings)->toBe([7, 'fx-rust-01', 2, '2026-10-05 11:59:00.500', 43, '2026-10-05 12:00:00.123', '2026-10-05 12:00:00.123']);
});

it('writes a workshop step as a tombstone and its parent row first', function () {
    $table = '`workshop_step_marks`';
    $wins = "{$table}.`set_at` IS NULL OR (`n`.`set_at` IS NOT NULL AND `n`.`set_at` >= {$table}.`set_at`)";
    $changes = "({$wins}) AND NOT ({$table}.`marked` <=> `n`.`marked` AND {$table}.`set_at` <=> `n`.`set_at`)";

    $step = UpsertSql::row(
        7,
        ['workshop_id' => 'fx-workshop-1', 'language' => 'rust', 'step_key' => 'e1'],
        [fieldWrite('workshop.step', [1])],
        43,
        upsertNow(),
    );
    $parent = UpsertSql::workshopParent(7, 'fx-workshop-1', 'rust', 43, upsertNow());

    expect($step->sql)->toBe(implode(' ', [
        'INSERT INTO `workshop_step_marks`',
        '(`user_id`, `workshop_id`, `language`, `step_key`, `marked`, `set_at`, `revision`, `created_at`, `updated_at`)',
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) AS `n`',
        'ON DUPLICATE KEY UPDATE',
        "`revision` = IF({$changes}, `n`.`revision`, {$table}.`revision`),",
        "`updated_at` = IF({$changes}, `n`.`updated_at`, {$table}.`updated_at`),",
        "`marked` = IF({$wins}, `n`.`marked`, {$table}.`marked`),",
        "`set_at` = IF({$wins}, `n`.`set_at`, {$table}.`set_at`)",
    ]))->and($step->bindings)->toBe([7, 'fx-workshop-1', 'rust', 'e1', 1, '2026-10-05 11:59:00.500', 43, '2026-10-05 12:00:00.123', '2026-10-05 12:00:00.123'])
        ->and($parent->sql)->toBe(implode(' ', [
            'INSERT INTO `workshop_progress`',
            '(`user_id`, `workshop_id`, `language`, `revision`, `created_at`, `updated_at`)',
            'VALUES (?, ?, ?, ?, ?, ?) AS `n`',
            'ON DUPLICATE KEY UPDATE `user_id` = `workshop_progress`.`user_id`',
        ]))->and($parent->bindings)->toBe([7, 'fx-workshop-1', 'rust', 43, '2026-10-05 12:00:00.123', '2026-10-05 12:00:00.123']);
});

it('never uses VALUES() or NOW() and always names the row alias', function (string $kind, array $key, array $values) {
    $sql = UpsertSql::row(7, $key, [fieldWrite($kind, $values, FieldKinds::definition($kind)->clockColumn !== null)], 43, upsertNow())->sql;

    expect($sql)->toContain(' AS `n` ON DUPLICATE KEY UPDATE ')
        ->and($sql)->not->toContain('VALUES(')
        ->and($sql)->not->toContain('NOW()');
})->with([
    'lww' => ['exercise.reflection', ['exercise_id' => 'fx-rust-01'], ['x']],
    'lww-group' => ['exercise.review', ['exercise_id' => 'fx-rust-01'], ['again', '2026-10-05 11:00:00.000', '2026-10-06 11:00:00.000']],
    'tombstone' => ['route.mark.step', ['kind' => 'step', 'item_key' => 's1'], [1]],
    'flag-or' => ['exercise.assisted', ['exercise_id' => 'fx-rust-01'], [1]],
    'max' => ['exercise.hintsRevealed', ['exercise_id' => 'fx-rust-01'], [2]],
    'dated-flag' => ['checkpoint.passed', ['world_id' => 'fx-world-1'], [1]],
    'observed' => ['workshop.objective', ['workshop_id' => 'fx-workshop-1', 'language' => 'go', 'objective_key' => 'o1'], []],
]);

it('assigns the revision and updated_at first, then each value before its clock', function () {
    $sql = UpsertSql::row(7, ['exercise_id' => 'fx-rust-01'], [fieldWrite('exercise.review', ['again', '2026-10-05 11:00:00.000', '2026-10-06 11:00:00.000'])], 43, upsertNow())->sql;

    $positions = collect(['`revision` = IF(', '`updated_at` = IF(', '`confidence` = IF(', '`reviewed_at` = IF(', '`review_due_at` = IF(', '`review_set_at` = IF('])
        ->map(fn (string $assignment) => strpos(overwriteAssignments($sql), $assignment));

    expect($positions->all())->toBe($positions->sort()->values()->all())
        ->and($positions->contains(false))->toBeFalse();
});

it('binds the columns of a lww group in the order of its columns', function () {
    $statement = UpsertSql::row(7, ['exercise_id' => 'fx-rust-01'], [fieldWrite('exercise.review', ['again', '2026-10-05 11:00:00.000', '2026-10-06 11:00:00.000'])], 43, upsertNow());

    expect($statement->sql)->toContain('(`user_id`, `exercise_id`, `confidence`, `reviewed_at`, `review_due_at`, `review_set_at`, `revision`, `created_at`, `updated_at`)')
        ->and($statement->bindings)->toBe([7, 'fx-rust-01', 'again', '2026-10-05 11:00:00.000', '2026-10-06 11:00:00.000', '2026-10-05 11:59:00.500', 43, '2026-10-05 12:00:00.123', '2026-10-05 12:00:00.123']);
});

it('compares only the prose and code columns as bytes and never inside the winner condition', function (string $kind, array $values, bool $casts) {
    $sql = UpsertSql::row(7, ['exercise_id' => 'fx-rust-01'], [fieldWrite($kind, $values)], 43, upsertNow())->sql;

    expect(str_contains($sql, 'CAST('))->toBe($casts)
        ->and(str_contains($sql, 'AS BINARY) >='))->toBeFalse();
})->with([
    'reflection' => ['exercise.reflection', ['x'], true],
    'custom test' => ['exercise.customTest', ['x'], true],
    'draft code' => ['exercise.draft', ['x', null], true],
    'prediction answer' => ['exercise.prediction.answer', [1], false],
    'review confidence' => ['exercise.review', ['again', '2026-10-05 11:00:00.000', '2026-10-06 11:00:00.000'], false],
]);

it('guards a flag that only grows by its stored value', function () {
    $sql = UpsertSql::row(7, ['exercise_id' => 'fx-rust-01'], [fieldWrite('exercise.assisted', [1], false)], 43, upsertNow())->sql;

    expect($sql)->toContain('`revision` = IF(`exercise_progress`.`assisted` = 0 AND `n`.`assisted` = 1, `n`.`revision`, `exercise_progress`.`revision`)')
        ->and($sql)->toContain('`assisted` = (`exercise_progress`.`assisted` OR `n`.`assisted`)');
});

it('guards a counter that only grows by comparing it with the stored one', function () {
    $table = '`exercise_progress`';
    $grows = "{$table}.`hints_revealed` IS NULL OR `n`.`hints_revealed` > {$table}.`hints_revealed`";

    $statement = UpsertSql::row(7, ['exercise_id' => 'fx-rust-01'], [fieldWrite('exercise.hintsRevealed', [2], false)], 43, upsertNow());

    expect($statement->sql)->toContain("`revision` = IF({$grows}, `n`.`revision`, {$table}.`revision`)")
        ->and($statement->sql)->toContain("`hints_revealed` = IF({$grows}, `n`.`hints_revealed`, {$table}.`hints_revealed`)")
        ->and($statement->bindings)->toBe([7, 'fx-rust-01', 2, 43, '2026-10-05 12:00:00.123', '2026-10-05 12:00:00.123']);
});

it('keeps the earliest known date of an observed key and has no updated_at', function () {
    $table = '`workshop_observations`';
    $date = '`observed_at`';

    $statement = UpsertSql::row(7, ['workshop_id' => 'fx-workshop-1', 'language' => 'go', 'objective_key' => 'fx-obj-1'], [fieldWrite('workshop.objective', [])], 43, upsertNow());

    expect($statement->sql)->toBe(implode(' ', [
        'INSERT INTO `workshop_observations`',
        '(`user_id`, `workshop_id`, `language`, `objective_key`, `observed_at`, `revision`, `created_at`)',
        'VALUES (?, ?, ?, ?, ?, ?, ?) AS `n`',
        'ON DUPLICATE KEY UPDATE',
        "`revision` = IF(({$table}.{$date} IS NULL AND `n`.{$date} IS NOT NULL) OR (`n`.{$date} IS NOT NULL AND `n`.{$date} < {$table}.{$date}), `n`.`revision`, {$table}.`revision`),",
        "{$date} = LEAST(COALESCE({$table}.{$date}, `n`.{$date}), COALESCE(`n`.{$date}, {$table}.{$date}))",
    ]))->and($statement->bindings)->toBe([7, 'fx-workshop-1', 'go', 'fx-obj-1', '2026-10-05 11:59:00.500', 43, '2026-10-05 12:00:00.123']);
});

it('binds a missing clock as null', function () {
    $statement = UpsertSql::row(7, ['exercise_id' => 'fx-rust-01'], [new FieldWrite(FieldKinds::definition('exercise.reflection'), ['Hola'], null)], 43, upsertNow());

    expect($statement->bindings)->toBe([7, 'fx-rust-01', 'Hola', null, 43, '2026-10-05 12:00:00.123', '2026-10-05 12:00:00.123']);
});
