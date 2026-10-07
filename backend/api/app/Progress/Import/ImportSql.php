<?php

namespace App\Progress\Import;

use App\Progress\Import\Legacy\LegacySeal;
use App\Progress\Merge\SqlStatement;
use App\Runs\Record\Instant;
use Carbon\CarbonImmutable;
use LogicException;

final class ImportSql
{
    private const TABLES_WITH_TOMBSTONES = ['route_marks', 'workshop_step_marks'];

    private const TABLES_WITHOUT_UPDATED_AT = ['workshop_observations'];

    private const TABLES_WITH_LEGACY_POSITION = ['route_marks', 'workshop_step_marks', 'workshop_observations'];

    public static function exerciseLegacy(
        int $userId,
        string $exerciseId,
        ?CarbonImmutable $solvedAt,
        ?int $legacyAttempts,
        ?AttemptPointer $pointer,
        int $revision,
        CarbonImmutable $now,
    ): SqlStatement {
        $stored = '`exercise_progress`';
        $changes = implode(' ', [
            "(`n`.`solved_at` IS NOT NULL AND ({$stored}.`solved_at` IS NULL OR `n`.`solved_at` < {$stored}.`solved_at`))",
            "OR (`n`.`legacy_attempts` IS NOT NULL AND ({$stored}.`legacy_attempts` IS NULL OR `n`.`legacy_attempts` > {$stored}.`legacy_attempts`))",
            "OR ({$stored}.`proof_attempt_id` IS NULL AND `n`.`proof_attempt_id` IS NOT NULL)",
            "OR ({$stored}.`last_attempt_id` IS NULL AND `n`.`last_attempt_id` IS NOT NULL)",
        ]);
        $sql = implode(' ', [
            "INSERT INTO {$stored}",
            '(`user_id`, `exercise_id`, `solved_at`, `legacy_attempts`, `proof_attempt_id`, `proof_at`, `last_attempt_id`, `last_attempt_at`, `revision`, `created_at`, `updated_at`)',
            'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) AS `n`',
            'ON DUPLICATE KEY UPDATE',
            "`revision` = IF({$changes}, `n`.`revision`, {$stored}.`revision`),",
            "`updated_at` = IF({$changes}, `n`.`updated_at`, {$stored}.`updated_at`),",
            "`solved_at` = LEAST(COALESCE({$stored}.`solved_at`, `n`.`solved_at`), COALESCE(`n`.`solved_at`, {$stored}.`solved_at`)),",
            "`legacy_attempts` = IF({$stored}.`legacy_attempts` IS NULL OR `n`.`legacy_attempts` > {$stored}.`legacy_attempts`, `n`.`legacy_attempts`, {$stored}.`legacy_attempts`),",
            "`proof_at` = IF({$stored}.`proof_attempt_id` IS NULL, `n`.`proof_at`, {$stored}.`proof_at`),",
            "`proof_attempt_id` = COALESCE({$stored}.`proof_attempt_id`, `n`.`proof_attempt_id`),",
            "`last_attempt_at` = IF({$stored}.`last_attempt_id` IS NULL, `n`.`last_attempt_at`, {$stored}.`last_attempt_at`),",
            "`last_attempt_id` = COALESCE({$stored}.`last_attempt_id`, `n`.`last_attempt_id`)",
        ]);
        $proof = $pointer !== null && $pointer->passed ? $pointer : null;
        $stamp = Instant::format($now);

        return new SqlStatement($sql, [
            $userId, $exerciseId, $solvedAt === null ? null : Instant::format($solvedAt), $legacyAttempts,
            $proof?->attemptId, $proof === null ? null : Instant::format($proof->attemptedAt),
            $pointer?->attemptId, $pointer === null ? null : Instant::format($pointer->attemptedAt),
            $revision, $stamp, $stamp,
        ]);
    }

    public static function workshopSeal(int $userId, string $workshopId, string $language, bool $codeSealed, int $revision, CarbonImmutable $now): SqlStatement
    {
        $stored = '`workshop_progress`';
        $raised = "{$stored}.`code_sealed` = 0 AND `n`.`code_sealed` = 1";
        $sql = implode(' ', [
            "INSERT INTO {$stored} (`user_id`, `workshop_id`, `language`, `code_sealed`, `revision`, `created_at`, `updated_at`)",
            'VALUES (?, ?, ?, ?, ?, ?, ?) AS `n`',
            'ON DUPLICATE KEY UPDATE',
            "`revision` = IF({$raised}, `n`.`revision`, {$stored}.`revision`),",
            "`updated_at` = IF({$raised}, `n`.`updated_at`, {$stored}.`updated_at`),",
            "`code_sealed` = ({$stored}.`code_sealed` OR `n`.`code_sealed`)",
        ]);
        $stamp = Instant::format($now);

        return new SqlStatement($sql, [$userId, $workshopId, $language, $codeSealed ? 1 : 0, $revision, $stamp, $stamp]);
    }

    public static function campaignSeal(int $userId, LegacySeal $seal, int $revision, CarbonImmutable $now): SqlStatement
    {
        $stored = '`campaign_seals`';
        $raised = implode(' ', [
            "({$stored}.`code` = 0 AND `n`.`code` = 1)",
            "OR ({$stored}.`prediction` = 0 AND `n`.`prediction` = 1)",
            "OR ({$stored}.`assisted` = 0 AND `n`.`assisted` = 1)",
        ]);
        $sql = implode(' ', [
            "INSERT INTO {$stored} (`user_id`, `exercise_id`, `code`, `prediction`, `assisted`, `imported_at`, `revision`)",
            'VALUES (?, ?, ?, ?, ?, ?, ?) AS `n`',
            'ON DUPLICATE KEY UPDATE',
            "`revision` = IF({$raised}, `n`.`revision`, {$stored}.`revision`),",
            "`imported_at` = IF({$raised}, `n`.`imported_at`, {$stored}.`imported_at`),",
            "`code` = ({$stored}.`code` OR `n`.`code`),",
            "`prediction` = ({$stored}.`prediction` OR `n`.`prediction`),",
            "`assisted` = ({$stored}.`assisted` OR `n`.`assisted`)",
        ]);

        return new SqlStatement($sql, [
            $userId, $seal->exerciseId, $seal->code ? 1 : 0, $seal->prediction ? 1 : 0, $seal->assisted ? 1 : 0, Instant::format($now), $revision,
        ]);
    }

    /** @param  array<string, string>  $key  the key columns after user_id, with their values */
    public static function legacyPosition(string $table, int $userId, array $key, int $position, int $revision, CarbonImmutable $now): SqlStatement
    {
        if (! in_array($table, self::TABLES_WITH_LEGACY_POSITION, true)) {
            throw new LogicException("La tabla {$table} no guarda una posición legada.");
        }
        $hasUpdatedAt = ! in_array($table, self::TABLES_WITHOUT_UPDATED_AT, true);

        $assignments = ['`revision` = IF(`legacy_position` IS NULL, ?, `revision`)'];
        $bindings = [$revision];
        if ($hasUpdatedAt) {
            $assignments[] = '`updated_at` = IF(`legacy_position` IS NULL, ?, `updated_at`)';
            $bindings[] = Instant::format($now);
        }
        $assignments[] = '`legacy_position` = COALESCE(`legacy_position`, ?)';
        $bindings[] = $position;

        $conditions = ['`user_id` = ?'];
        $bindings[] = $userId;
        foreach ($key as $column => $value) {
            $conditions[] = "`{$column}` = ?";
            $bindings[] = $value;
        }
        if (in_array($table, self::TABLES_WITH_TOMBSTONES, true)) {
            $conditions[] = '`marked` = 1';
        }

        return new SqlStatement(
            "UPDATE `{$table}` SET ".implode(', ', $assignments).' WHERE '.implode(' AND ', $conditions),
            $bindings,
        );
    }
}
