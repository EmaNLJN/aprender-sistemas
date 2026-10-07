<?php

use App\Progress\Import\AttemptPointer;
use App\Progress\Import\ImportSql;
use App\Progress\Import\Legacy\LegacySeal;
use Carbon\CarbonImmutable;

function importSqlNow(): CarbonImmutable
{
    return CarbonImmutable::parse('2026-10-06T12:00:00.123Z');
}

function importSqlPointer(bool $passed): AttemptPointer
{
    return new AttemptPointer(901, CarbonImmutable::parse('2026-10-05T11:59:00.500Z'), $passed);
}

function importSqlExerciseChange(): string
{
    return implode(' ', [
        '(`n`.`solved_at` IS NOT NULL AND (`exercise_progress`.`solved_at` IS NULL OR `n`.`solved_at` < `exercise_progress`.`solved_at`))',
        'OR (`n`.`legacy_attempts` IS NOT NULL AND (`exercise_progress`.`legacy_attempts` IS NULL OR `n`.`legacy_attempts` > `exercise_progress`.`legacy_attempts`))',
        'OR (`exercise_progress`.`proof_attempt_id` IS NULL AND `n`.`proof_attempt_id` IS NOT NULL)',
        'OR (`exercise_progress`.`last_attempt_id` IS NULL AND `n`.`last_attempt_id` IS NOT NULL)',
    ]);
}

function importSqlExerciseLegacySql(): string
{
    $change = importSqlExerciseChange();

    return implode(' ', [
        'INSERT INTO `exercise_progress`',
        '(`user_id`, `exercise_id`, `solved_at`, `legacy_attempts`, `proof_attempt_id`, `proof_at`, `last_attempt_id`, `last_attempt_at`, `revision`, `created_at`, `updated_at`)',
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) AS `n`',
        'ON DUPLICATE KEY UPDATE',
        "`revision` = IF({$change}, `n`.`revision`, `exercise_progress`.`revision`),",
        "`updated_at` = IF({$change}, `n`.`updated_at`, `exercise_progress`.`updated_at`),",
        '`solved_at` = LEAST(COALESCE(`exercise_progress`.`solved_at`, `n`.`solved_at`), COALESCE(`n`.`solved_at`, `exercise_progress`.`solved_at`)),',
        '`legacy_attempts` = IF(`exercise_progress`.`legacy_attempts` IS NULL OR `n`.`legacy_attempts` > `exercise_progress`.`legacy_attempts`, `n`.`legacy_attempts`, `exercise_progress`.`legacy_attempts`),',
        '`proof_at` = IF(`exercise_progress`.`proof_attempt_id` IS NULL, `n`.`proof_at`, `exercise_progress`.`proof_at`),',
        '`proof_attempt_id` = COALESCE(`exercise_progress`.`proof_attempt_id`, `n`.`proof_attempt_id`),',
        '`last_attempt_at` = IF(`exercise_progress`.`last_attempt_id` IS NULL, `n`.`last_attempt_at`, `exercise_progress`.`last_attempt_at`),',
        '`last_attempt_id` = COALESCE(`exercise_progress`.`last_attempt_id`, `n`.`last_attempt_id`)',
    ]);
}

function importSqlAllStatements(): array
{
    $now = importSqlNow();

    return [
        'exerciseLegacy' => ImportSql::exerciseLegacy(7, 'fx-rust-01', $now, 3, importSqlPointer(true), 43, $now),
        'workshopSeal' => ImportSql::workshopSeal(7, 'fx-workshop-1', 'go', true, 43, $now),
        'campaignSeal' => ImportSql::campaignSeal(7, new LegacySeal('fx-rust-01', true, false, true), 43, $now),
        'legacyPosition of a route mark' => ImportSql::legacyPosition('route_marks', 7, ['kind' => 'step', 'item_key' => 'fx-step-1'], 2, 43, $now),
        'legacyPosition of a workshop step' => ImportSql::legacyPosition('workshop_step_marks', 7, ['workshop_id' => 'fx-workshop-1', 'language' => 'go', 'step_key' => 'e1'], 0, 43, $now),
        'legacyPosition of an objective' => ImportSql::legacyPosition('workshop_observations', 7, ['workshop_id' => 'fx-workshop-1', 'language' => 'go', 'objective_key' => 'fx-obj-1'], 1, 43, $now),
    ];
}

it('writes the legacy data of an exercise with its pointers as one exact statement', function () {
    $now = importSqlNow();

    $statement = ImportSql::exerciseLegacy(7, 'fx-rust-01', CarbonImmutable::parse('2026-10-04T08:00:00.250Z'), 3, importSqlPointer(true), 43, $now);

    expect($statement->sql)->toBe(importSqlExerciseLegacySql())
        ->and($statement->bindings)->toBe([
            7, 'fx-rust-01', '2026-10-04 08:00:00.250', 3, 901, '2026-10-05 11:59:00.500', 901, '2026-10-05 11:59:00.500',
            43, '2026-10-06 12:00:00.123', '2026-10-06 12:00:00.123',
        ]);
});

it('points the proof only to a passed attempt and the last attempt to any', function () {
    $statement = ImportSql::exerciseLegacy(7, 'fx-rust-01', null, 2, importSqlPointer(false), 43, importSqlNow());

    expect($statement->sql)->toBe(importSqlExerciseLegacySql())
        ->and($statement->bindings)->toBe([
            7, 'fx-rust-01', null, 2, null, null, 901, '2026-10-05 11:59:00.500',
            43, '2026-10-06 12:00:00.123', '2026-10-06 12:00:00.123',
        ]);
});

it('binds nulls when the exercise has neither a pointer, a solve date nor attempts', function () {
    $statement = ImportSql::exerciseLegacy(7, 'fx-rust-01', null, null, null, 43, importSqlNow());

    expect($statement->sql)->toBe(importSqlExerciseLegacySql())
        ->and($statement->bindings)->toBe([
            7, 'fx-rust-01', null, null, null, null, null, null, 43, '2026-10-06 12:00:00.123', '2026-10-06 12:00:00.123',
        ]);
});

it('creates the workshop and merges the code seal with an OR as one exact statement', function () {
    $raised = '`workshop_progress`.`code_sealed` = 0 AND `n`.`code_sealed` = 1';

    $statement = ImportSql::workshopSeal(7, 'fx-workshop-1', 'go', true, 43, importSqlNow());

    expect($statement->sql)->toBe(implode(' ', [
        'INSERT INTO `workshop_progress` (`user_id`, `workshop_id`, `language`, `code_sealed`, `revision`, `created_at`, `updated_at`)',
        'VALUES (?, ?, ?, ?, ?, ?, ?) AS `n`',
        'ON DUPLICATE KEY UPDATE',
        "`revision` = IF({$raised}, `n`.`revision`, `workshop_progress`.`revision`),",
        "`updated_at` = IF({$raised}, `n`.`updated_at`, `workshop_progress`.`updated_at`),",
        '`code_sealed` = (`workshop_progress`.`code_sealed` OR `n`.`code_sealed`)',
    ]))->and($statement->bindings)->toBe([7, 'fx-workshop-1', 'go', 1, 43, '2026-10-06 12:00:00.123', '2026-10-06 12:00:00.123']);
});

it('binds an unsealed workshop code as 0', function () {
    $statement = ImportSql::workshopSeal(7, 'fx-workshop-1', 'rust', false, 43, importSqlNow());

    expect($statement->bindings)->toBe([7, 'fx-workshop-1', 'rust', 0, 43, '2026-10-06 12:00:00.123', '2026-10-06 12:00:00.123']);
});

it('merges the three flags of a campaign seal with an OR as one exact statement', function () {
    $raised = implode(' ', [
        '(`campaign_seals`.`code` = 0 AND `n`.`code` = 1)',
        'OR (`campaign_seals`.`prediction` = 0 AND `n`.`prediction` = 1)',
        'OR (`campaign_seals`.`assisted` = 0 AND `n`.`assisted` = 1)',
    ]);

    $statement = ImportSql::campaignSeal(7, new LegacySeal('fx-rust-01', true, false, true), 43, importSqlNow());

    expect($statement->sql)->toBe(implode(' ', [
        'INSERT INTO `campaign_seals` (`user_id`, `exercise_id`, `code`, `prediction`, `assisted`, `imported_at`, `revision`)',
        'VALUES (?, ?, ?, ?, ?, ?, ?) AS `n`',
        'ON DUPLICATE KEY UPDATE',
        "`revision` = IF({$raised}, `n`.`revision`, `campaign_seals`.`revision`),",
        "`imported_at` = IF({$raised}, `n`.`imported_at`, `campaign_seals`.`imported_at`),",
        '`code` = (`campaign_seals`.`code` OR `n`.`code`),',
        '`prediction` = (`campaign_seals`.`prediction` OR `n`.`prediction`),',
        '`assisted` = (`campaign_seals`.`assisted` OR `n`.`assisted`)',
    ]))->and($statement->bindings)->toBe([7, 'fx-rust-01', 1, 0, 1, '2026-10-06 12:00:00.123', 43]);
});

it('keeps the first position of a route mark and skips the tombstones', function () {
    $statement = ImportSql::legacyPosition('route_marks', 7, ['kind' => 'step', 'item_key' => 'fx-step-1'], 2, 43, importSqlNow());

    expect($statement->sql)->toBe(implode(' ', [
        'UPDATE `route_marks`',
        'SET `revision` = IF(`legacy_position` IS NULL, ?, `revision`),',
        '`updated_at` = IF(`legacy_position` IS NULL, ?, `updated_at`),',
        '`legacy_position` = COALESCE(`legacy_position`, ?)',
        'WHERE `user_id` = ? AND `kind` = ? AND `item_key` = ? AND `marked` = 1',
    ]))->and($statement->bindings)->toBe([43, '2026-10-06 12:00:00.123', 2, 7, 'step', 'fx-step-1']);
});

it('keeps the first position of a workshop step and skips the tombstones', function () {
    $key = ['workshop_id' => 'fx-workshop-1', 'language' => 'go', 'step_key' => 'e1'];

    $statement = ImportSql::legacyPosition('workshop_step_marks', 7, $key, 0, 43, importSqlNow());

    expect($statement->sql)->toBe(implode(' ', [
        'UPDATE `workshop_step_marks`',
        'SET `revision` = IF(`legacy_position` IS NULL, ?, `revision`),',
        '`updated_at` = IF(`legacy_position` IS NULL, ?, `updated_at`),',
        '`legacy_position` = COALESCE(`legacy_position`, ?)',
        'WHERE `user_id` = ? AND `workshop_id` = ? AND `language` = ? AND `step_key` = ? AND `marked` = 1',
    ]))->and($statement->bindings)->toBe([43, '2026-10-06 12:00:00.123', 0, 7, 'fx-workshop-1', 'go', 'e1']);
});

it('keeps the first position of an observation, which has neither updated_at nor marked', function () {
    $key = ['workshop_id' => 'fx-workshop-1', 'language' => 'go', 'objective_key' => 'fx-obj-1'];

    $statement = ImportSql::legacyPosition('workshop_observations', 7, $key, 1, 43, importSqlNow());

    expect($statement->sql)->toBe(implode(' ', [
        'UPDATE `workshop_observations`',
        'SET `revision` = IF(`legacy_position` IS NULL, ?, `revision`),',
        '`legacy_position` = COALESCE(`legacy_position`, ?)',
        'WHERE `user_id` = ? AND `workshop_id` = ? AND `language` = ? AND `objective_key` = ?',
    ]))->and($statement->bindings)->toBe([43, 1, 7, 'fx-workshop-1', 'go', 'fx-obj-1']);
});

it('refuses a table that has no legacy position', function () {
    ImportSql::legacyPosition('preferences', 7, [], 0, 43, importSqlNow());
})->throws(LogicException::class);

it('never uses VALUES() or the database clock', function (string $name, string $sql) {
    expect($sql)->not->toContain('VALUES(')->and($sql)->not->toContain('NOW(')->and($sql)->not->toContain('CURRENT_TIMESTAMP');
})->with(fn () => collect(importSqlAllStatements())->map(fn ($statement, $name) => [$name, $statement->sql])->all());

it('assigns each date before the pointer that it reads', function () {
    $sql = ImportSql::exerciseLegacy(7, 'fx-rust-01', null, null, null, 43, importSqlNow())->sql;
    $update = substr($sql, (int) strpos($sql, 'ON DUPLICATE KEY UPDATE'));

    expect(strpos($update, '`proof_at` = '))->toBeLessThan(strpos($update, '`proof_attempt_id` = '))
        ->and(strpos($update, '`last_attempt_at` = '))->toBeLessThan(strpos($update, '`last_attempt_id` = '))
        ->and(strpos($update, '`revision` = '))->toBeLessThan(strpos($update, '`updated_at` = '))
        ->and(strpos($update, '`updated_at` = '))->toBeLessThan(strpos($update, '`solved_at` = '));
});
