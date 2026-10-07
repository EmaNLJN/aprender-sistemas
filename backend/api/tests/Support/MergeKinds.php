<?php

namespace Tests\Support;

use App\Progress\Operations\Checked;
use App\Progress\Operations\Operation;
use App\Progress\Operations\OperationType;
use App\Runs\Record\Instant;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use LogicException;

final class MergeKinds
{
    private const EXERCISE = ['exercise_id' => 'fx-rust-01'];

    private const WORLD = ['world_id' => 'fx-world-1'];

    private const WORKSHOP = ['workshop_id' => 'fx-workshop-1', 'language' => 'rust'];

    private const BOOLEAN_COLUMNS = ['marked', 'assisted', 'solution_seen', 'prediction_correct', 'passed'];

    private const INTEGER_COLUMNS = ['prediction_answer', 'last_answer', 'answer', 'hints_revealed', 'focus_minutes'];

    private const DATE_COLUMNS = ['reviewed_at', 'review_due_at'];

    private const COMPANIONS = [
        'exercise.prediction.answer' => 'exercise.predictionCorrect',
        'exercise.predictionCorrect' => 'exercise.prediction.answer',
        'checkpoint.lastAnswer' => 'checkpoint.passed',
        'checkpoint.passed' => 'checkpoint.lastAnswer',
        'workshop.answer' => 'workshop.predictionCorrect',
        'workshop.predictionCorrect' => 'workshop.answer',
    ];

    private const COMPANION_VALUES = [
        'exercise.prediction.answer' => true,
        'exercise.predictionCorrect' => 0,
        'checkpoint.lastAnswer' => true,
        'checkpoint.passed' => 0,
        'workshop.answer' => true,
        'workshop.predictionCorrect' => 0,
    ];

    /** @return array<string, mixed> */
    private static function definition(string $kind): array
    {
        $workshopChild = ['table' => 'workshop_step_marks', 'parent' => true];
        $routeMark = ['table' => 'route_marks', 'columns' => ['value' => 'marked'], 'clock' => 'set_at'];

        return match ($kind) {
            'exercise.prediction.answer' => ['table' => 'exercise_progress', 'key' => self::EXERCISE, 'columns' => ['value' => 'prediction_answer'], 'clock' => 'prediction_answer_set_at'],
            'exercise.reflection' => ['table' => 'exercise_progress', 'key' => self::EXERCISE, 'columns' => ['value' => 'reflection'], 'clock' => 'reflection_set_at'],
            'exercise.customTest' => ['table' => 'exercise_progress', 'key' => self::EXERCISE, 'columns' => ['value' => 'custom_test'], 'clock' => 'custom_test_set_at'],
            'checkpoint.lastAnswer' => ['table' => 'campaign_checkpoints', 'key' => self::WORLD, 'columns' => ['value' => 'last_answer'], 'clock' => 'last_answer_set_at'],
            'workshop.answer' => ['table' => 'workshop_progress', 'key' => self::WORKSHOP, 'columns' => ['value' => 'answer'], 'clock' => 'answer_set_at'],
            'workshop.note' => ['table' => 'workshop_progress', 'key' => self::WORKSHOP, 'columns' => ['value' => 'note'], 'clock' => 'note_set_at'],
            'route.quiz' => ['table' => 'route_quiz_answers', 'key' => ['step_id' => 'fx-step-1'], 'columns' => ['value' => 'answer'], 'clock' => 'set_at'],
            'route.note' => ['table' => 'route_notes', 'key' => ['language' => 'rust', 'field' => 'learned'], 'columns' => ['value' => 'body'], 'clock' => 'set_at'],
            'preference.routeLanguage' => ['table' => 'preferences', 'key' => [], 'columns' => ['value' => 'route_language'], 'clock' => 'route_language_set_at'],
            'preference.focusMinutes' => ['table' => 'preferences', 'key' => [], 'columns' => ['value' => 'focus_minutes'], 'clock' => 'focus_minutes_set_at'],
            'preference.labSelectedRust' => ['table' => 'preferences', 'key' => [], 'columns' => ['value' => 'lab_selected_rust'], 'clock' => 'lab_selected_rust_set_at'],
            'preference.labSelectedGo' => ['table' => 'preferences', 'key' => [], 'columns' => ['value' => 'lab_selected_go'], 'clock' => 'lab_selected_go_set_at'],
            'exercise.review' => ['table' => 'exercise_progress', 'key' => self::EXERCISE, 'columns' => ['confidence' => 'confidence', 'reviewedAt' => 'reviewed_at', 'reviewDueAt' => 'review_due_at'], 'clock' => 'review_set_at'],
            'exercise.draft' => ['table' => 'drafts', 'key' => self::EXERCISE, 'columns' => ['code' => 'code', 'starterHash' => 'starter_hash'], 'clock' => 'set_at'],
            'workshop.step' => [...$workshopChild, 'key' => [...self::WORKSHOP, 'step_key' => 'e1'], 'columns' => ['value' => 'marked'], 'clock' => 'set_at'],
            'route.mark.step' => [...$routeMark, 'key' => ['kind' => 'step', 'item_key' => 'fx-step-1']],
            'route.mark.milestone' => [...$routeMark, 'key' => ['kind' => 'milestone', 'item_key' => 'rust-memory']],
            'route.mark.favorite' => [...$routeMark, 'key' => ['kind' => 'favorite', 'item_key' => 'fx-res-1']],
            'exercise.assisted' => ['table' => 'exercise_progress', 'key' => self::EXERCISE, 'columns' => ['value' => 'assisted'], 'clock' => null],
            'exercise.solutionSeen' => ['table' => 'exercise_progress', 'key' => self::EXERCISE, 'columns' => ['value' => 'solution_seen'], 'clock' => null],
            'exercise.hintsRevealed' => ['table' => 'exercise_progress', 'key' => self::EXERCISE, 'columns' => ['value' => 'hints_revealed'], 'clock' => null],
            'exercise.predictionCorrect' => ['table' => 'exercise_progress', 'key' => self::EXERCISE, 'columns' => ['value' => 'prediction_correct'], 'clock' => 'prediction_correct_at'],
            'checkpoint.passed' => ['table' => 'campaign_checkpoints', 'key' => self::WORLD, 'columns' => ['value' => 'passed'], 'clock' => 'passed_at'],
            'workshop.predictionCorrect' => ['table' => 'workshop_progress', 'key' => self::WORKSHOP, 'columns' => ['value' => 'prediction_correct'], 'clock' => 'prediction_correct_at'],
            'workshop.objective' => ['table' => 'workshop_observations', 'key' => self::WORKSHOP, 'columns' => [], 'clock' => 'observed_at', 'parent' => true, 'observed' => true],
            default => throw new LogicException("Unknown kind {$kind}"),
        };
    }

    /**
     * Seeds the stored state of one kind with plain SQL. A kind that shares its operation with another one also
     * gets its companion group seeded with the values of the operation itself, so only the tested group can change.
     *
     * @param  ?array<string, mixed>  $stored
     * @param  array<string, mixed>  $firstIncoming
     */
    public static function seed(int $userId, string $kind, ?array $stored, array $firstIncoming, int $revision): void
    {
        if ($stored === null) {
            return;
        }
        $definition = self::definition($kind);
        if (isset($definition['parent'])) {
            self::seedWorkshop($userId, $revision);
        }
        if (isset($definition['observed'])) {
            self::seedObservations($userId, $definition, $stored, $revision);

            return;
        }
        $columns = self::columnsOf($definition, $stored);
        if (isset(self::COMPANIONS[$kind])) {
            $companion = self::COMPANIONS[$kind];
            $columns = [...$columns, ...self::columnsOf(self::definition($companion), ['value' => self::COMPANION_VALUES[$kind], 'at' => $firstIncoming['at'] ?? null])];
        }
        DB::table($definition['table'])->insert([
            'user_id' => $userId, ...$definition['key'], ...$columns, ...self::stamps($definition['table'], $revision),
        ]);
    }

    /** @return ?array<string, mixed> the state in the neutral shape of merge-rules.md section 2 */
    public static function read(int $userId, string $kind): ?array
    {
        $definition = self::definition($kind);
        if (isset($definition['observed'])) {
            return self::readObservations($userId, $definition);
        }
        $row = DB::table($definition['table'])->where('user_id', $userId)->where($definition['key'])->first();
        if ($row === null) {
            return null;
        }
        $row = (array) $row;
        $values = [];
        foreach ($definition['columns'] as $name => $column) {
            $values[$name] = self::fromDatabase($column, $row[$column]);
        }
        $state = ['value' => array_keys($definition['columns']) === ['value'] ? $values['value'] : $values];
        if ($definition['clock'] !== null) {
            $state['at'] = self::isoOrNull($row[$definition['clock']]);
        }

        return $state;
    }

    public static function rowRevision(int $userId, string $kind): ?int
    {
        $definition = self::definition($kind);
        $revision = DB::table($definition['table'])->where('user_id', $userId)->where($definition['key'])->max('revision');

        return $revision === null ? null : (int) $revision;
    }

    /** @param array<string, mixed> $write one entry of `incoming` */
    public static function checked(string $kind, array $write, string $id, string $contentVersion): Checked
    {
        [$type, $values] = self::operationOf($kind, $write);
        $at = CarbonImmutable::parse($write['at'] ?? '2026-10-05T12:00:00.000Z');

        return Checked::ready(new Operation($id, $type, $at, $values, str_repeat('0', 64), $contentVersion), false);
    }

    /**
     * @param  array<string, mixed>  $write
     * @return array{OperationType, array<string, string|int|bool|null>}
     */
    private static function operationOf(string $kind, array $write): array
    {
        $value = $write['value'] ?? null;
        $exercise = ['exerciseId' => 'fx-rust-01'];
        $workshop = ['workshopId' => 'fx-workshop-1', 'language' => 'rust'];

        return match ($kind) {
            'exercise.prediction.answer' => [OperationType::ExercisePrediction, [...$exercise, 'answer' => $value, 'correct' => true]],
            'exercise.predictionCorrect' => [OperationType::ExercisePrediction, [...$exercise, 'answer' => 0, 'correct' => $value]],
            'exercise.reflection' => [OperationType::ExerciseReflection, [...$exercise, 'text' => $value]],
            'exercise.customTest' => [OperationType::ExerciseCustomTest, [...$exercise, 'text' => $value]],
            'exercise.review' => [OperationType::ExerciseReview, [...$exercise, ...$value]],
            'exercise.draft' => [OperationType::ExerciseDraft, [...$exercise, ...$value]],
            'exercise.assisted' => [OperationType::ExerciseAssist, [...$exercise, 'assisted' => $value]],
            'exercise.solutionSeen' => [OperationType::ExerciseAssist, [...$exercise, 'solutionSeen' => $value]],
            'exercise.hintsRevealed' => [OperationType::ExerciseHints, [...$exercise, 'revealed' => $value]],
            'checkpoint.lastAnswer' => [OperationType::CheckpointAnswer, ['worldId' => 'fx-world-1', 'answer' => $value, 'passed' => true]],
            'checkpoint.passed' => [OperationType::CheckpointAnswer, ['worldId' => 'fx-world-1', 'answer' => 0, 'passed' => $value]],
            'workshop.answer' => [OperationType::WorkshopPrediction, [...$workshop, 'answer' => $value, 'correct' => true]],
            'workshop.predictionCorrect' => [OperationType::WorkshopPrediction, [...$workshop, 'answer' => 0, 'correct' => $value]],
            'workshop.note' => [OperationType::WorkshopNote, [...$workshop, 'text' => $value]],
            'workshop.objective' => [OperationType::WorkshopObjective, [...$workshop, 'objectiveKey' => $write['key']]],
            'workshop.step' => [OperationType::WorkshopStep, [...$workshop, 'stepKey' => 'e1', 'marked' => $value]],
            'route.mark.step' => [OperationType::RouteMark, ['kind' => 'step', 'itemKey' => 'fx-step-1', 'marked' => $value]],
            'route.mark.milestone' => [OperationType::RouteMark, ['kind' => 'milestone', 'itemKey' => 'rust-memory', 'marked' => $value]],
            'route.mark.favorite' => [OperationType::RouteMark, ['kind' => 'favorite', 'itemKey' => 'fx-res-1', 'marked' => $value]],
            'route.quiz' => [OperationType::RouteQuiz, ['stepId' => 'fx-step-1', 'answer' => $value]],
            'route.note' => [OperationType::RouteNote, ['language' => 'rust', 'field' => 'learned', 'body' => $value]],
            'preference.routeLanguage' => [OperationType::PreferenceSet, ['name' => 'routeLanguage', 'value' => $value]],
            'preference.focusMinutes' => [OperationType::PreferenceSet, ['name' => 'focusMinutes', 'value' => $value]],
            'preference.labSelectedRust' => [OperationType::PreferenceSet, ['name' => 'labSelectedRust', 'value' => $value]],
            'preference.labSelectedGo' => [OperationType::PreferenceSet, ['name' => 'labSelectedGo', 'value' => $value]],
            default => throw new LogicException("Unknown kind {$kind}"),
        };
    }

    /**
     * @param  array<string, mixed>  $definition
     * @param  array<string, mixed>  $state
     * @return array<string, string|int|null>
     */
    private static function columnsOf(array $definition, array $state): array
    {
        $columns = [];
        $value = $state['value'];
        foreach ($definition['columns'] as $name => $column) {
            $columns[$column] = self::toDatabase($column, $name === 'value' ? $value : $value[$name]);
        }
        if ($definition['clock'] !== null) {
            $columns[$definition['clock']] = self::databaseInstantOrNull($state['at'] ?? null);
        }

        return $columns;
    }

    /**
     * @param  array<string, mixed>  $definition
     * @param  array<string, mixed>  $stored
     */
    private static function seedObservations(int $userId, array $definition, array $stored, int $revision): void
    {
        foreach ($stored['observed'] as $observation) {
            DB::table('workshop_observations')->insert([
                'user_id' => $userId, ...$definition['key'], 'objective_key' => $observation['key'],
                'observed_at' => self::databaseInstantOrNull($observation['at']), ...self::stamps('workshop_observations', $revision),
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $definition
     * @return array{observed: list<array{key: string, at: ?string}>}
     */
    private static function readObservations(int $userId, array $definition): array
    {
        $observed = [];
        $rows = DB::table('workshop_observations')->where('user_id', $userId)->where($definition['key'])->orderBy('objective_key')->get();
        foreach ($rows as $row) {
            $observed[] = ['key' => $row->objective_key, 'at' => self::isoOrNull($row->observed_at)];
        }

        return ['observed' => $observed];
    }

    private static function seedWorkshop(int $userId, int $revision): void
    {
        DB::table('workshop_progress')->insertOrIgnore(['user_id' => $userId, ...self::WORKSHOP, ...self::stamps('workshop_progress', $revision)]);
    }

    /** @return array<string, int|string> */
    private static function stamps(string $table, int $revision): array
    {
        $at = '2026-10-05 11:00:00.000';

        return [
            'revision' => $revision, 'created_at' => $at,
            ...($table === 'workshop_observations' ? [] : ['updated_at' => $at]),
        ];
    }

    private static function toDatabase(string $column, mixed $value): string|int|null
    {
        if (is_bool($value)) {
            return $value ? 1 : 0;
        }
        if (in_array($column, self::DATE_COLUMNS, true) && is_string($value)) {
            return self::databaseInstantOrNull($value);
        }

        return $value;
    }

    private static function fromDatabase(string $column, mixed $value): mixed
    {
        return match (true) {
            $value === null => null,
            in_array($column, self::BOOLEAN_COLUMNS, true) => (bool) $value,
            in_array($column, self::INTEGER_COLUMNS, true) => (int) $value,
            in_array($column, self::DATE_COLUMNS, true) => Instant::iso(Instant::parse($value)),
            default => $value,
        };
    }

    private static function databaseInstantOrNull(?string $iso): ?string
    {
        return $iso === null ? null : Instant::format(CarbonImmutable::parse($iso));
    }

    private static function isoOrNull(?string $database): ?string
    {
        return $database === null ? null : Instant::iso(Instant::parse($database));
    }
}
