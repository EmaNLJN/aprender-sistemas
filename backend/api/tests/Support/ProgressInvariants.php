<?php

namespace Tests\Support;

use App\Progress\ProgressTables;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Assert;
use stdClass;

final class ProgressInvariants
{
    public const TOMBSTONE_CLOCK = 'an unmarked step or route mark carries its clock';

    public const DRAFT_CLOCK = 'a draft without code carries its clock';

    public const DATE_WITHOUT_FLAG = 'a prediction or checkpoint date exists only with its flag at 1';

    public const CLOCK_WITHOUT_VALUE = 'a clock exists only with the value that it dates';

    public const REVIEW_GROUP = 'confidence, reviewed_at and review_due_at are written together, and review_set_at needs a confidence';

    public const REVISION_AHEAD_OF_HEAD = 'a row has no revision newer than the head of its account';

    private const KEYS = [
        'exercise_progress' => ['user_id', 'exercise_id'],
        'drafts' => ['user_id', 'exercise_id'],
        'campaign_checkpoints' => ['user_id', 'world_id'],
        'workshop_progress' => ['user_id', 'workshop_id', 'language'],
        'workshop_observations' => ['user_id', 'workshop_id', 'language', 'objective_key'],
        'workshop_step_marks' => ['user_id', 'workshop_id', 'language', 'step_key'],
        'route_marks' => ['user_id', 'kind', 'item_key'],
        'route_quiz_answers' => ['user_id', 'step_id'],
        'route_notes' => ['user_id', 'language', 'field'],
        'preferences' => ['user_id'],
    ];

    private const CLOCKS_WITH_VALUES = [
        'exercise_progress' => ['prediction_answer_set_at' => 'prediction_answer', 'reflection_set_at' => 'reflection', 'custom_test_set_at' => 'custom_test', 'review_set_at' => 'confidence'],
        'workshop_progress' => ['answer_set_at' => 'answer', 'note_set_at' => 'note'],
        'campaign_checkpoints' => ['last_answer_set_at' => 'last_answer'],
    ];

    /** @return array<string, list<string>> the rule that is broken and the rows that break it */
    public static function violations(?int $userId = null): array
    {
        $rules = [
            self::TOMBSTONE_CLOCK => self::rows(['workshop_step_marks', 'route_marks'], 'marked = 0 and set_at is null', $userId),
            self::DRAFT_CLOCK => self::rows(['drafts'], 'code is null and set_at is null', $userId),
            self::DATE_WITHOUT_FLAG => [
                ...self::rows(['exercise_progress', 'workshop_progress'], 'prediction_correct = 0 and prediction_correct_at is not null', $userId),
                ...self::rows(['campaign_checkpoints'], 'passed = 0 and passed_at is not null', $userId),
            ],
            self::CLOCK_WITHOUT_VALUE => self::clocksWithoutValue($userId),
            self::REVIEW_GROUP => self::rows(
                ['exercise_progress'],
                '(confidence is null) <> (reviewed_at is null) or (confidence is null) <> (review_due_at is null)',
                $userId,
            ),
            self::REVISION_AHEAD_OF_HEAD => self::revisionsAheadOfHead($userId),
        ];

        return array_filter($rules, fn (array $rows) => $rows !== []);
    }

    public static function assertClean(?int $userId = null): void
    {
        foreach (self::violations($userId) as $rule => $rows) {
            Assert::fail("{$rule}: ".implode(', ', $rows));
        }
    }

    /** @return list<string> */
    private static function clocksWithoutValue(?int $userId): array
    {
        $rows = [];
        foreach (self::CLOCKS_WITH_VALUES as $table => $pairs) {
            foreach ($pairs as $clock => $value) {
                $rows = [...$rows, ...self::rows([$table], "{$clock} is not null and {$value} is null", $userId)];
            }
        }

        return $rows;
    }

    /** @return list<string> */
    private static function revisionsAheadOfHead(?int $userId): array
    {
        $rows = [];
        foreach (ProgressTables::STATE as $table) {
            $key = self::label($table, 't');
            $filter = $userId === null ? '' : ' and t.user_id = ?';
            $found = DB::select(
                "select {$key} as label from `{$table}` t join progress_heads h on h.user_id = t.user_id where t.revision > h.revision{$filter}",
                $userId === null ? [] : [$userId],
            );
            $rows = [...$rows, ...self::labels($found)];
        }

        return $rows;
    }

    /**
     * @param  list<string>  $tables
     * @return list<string>
     */
    private static function rows(array $tables, string $condition, ?int $userId): array
    {
        $rows = [];
        foreach ($tables as $table) {
            $filter = $userId === null ? '' : ' and user_id = ?';
            $found = DB::select(
                'select '.self::label($table)." as label from `{$table}` where ({$condition}){$filter}",
                $userId === null ? [] : [$userId],
            );
            $rows = [...$rows, ...self::labels($found)];
        }

        return $rows;
    }

    private static function label(string $table, string $alias = ''): string
    {
        $prefix = $alias === '' ? '' : "{$alias}.";
        $columns = implode(', ', array_map(fn (string $column) => "{$prefix}{$column}", self::KEYS[$table]));

        return "concat('{$table}:', concat_ws('/', {$columns}))";
    }

    /**
     * @param  array<int, stdClass>  $rows
     * @return list<string>
     */
    private static function labels(array $rows): array
    {
        return array_values(array_map(fn (stdClass $row) => $row->label, $rows));
    }
}
