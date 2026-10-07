<?php

namespace Tests\Support;

use App\Runs\Record\Instant;
use Illuminate\Support\Facades\DB;
use stdClass;

final class V1Projection
{
    private const LEGACY_ORDER = 'legacy_position IS NULL, legacy_position, created_at';

    private const LANGUAGES = ['rust', 'go'];

    private const NOTE_FIELDS = ['learned', 'next'];

    /** @return array{route: stdClass, lab: stdClass, campaign: stdClass, systems: stdClass} */
    public static function of(int $userId): array
    {
        return [
            'route' => self::route($userId),
            'lab' => self::lab($userId),
            'campaign' => self::campaign($userId),
            'systems' => self::systems($userId),
        ];
    }

    private static function route(int $userId): stdClass
    {
        $preferences = DB::table('preferences')->where('user_id', $userId)->first();

        return (object) [
            'version' => 1,
            'language' => $preferences?->route_language ?? 'rust',
            'completed' => self::markedRouteKeys($userId, 'step'),
            'milestones' => self::markedRouteKeys($userId, 'milestone'),
            'favorites' => self::markedRouteKeys($userId, 'favorite'),
            'quizAnswers' => (object) DB::table('route_quiz_answers')->where('user_id', $userId)->pluck('answer', 'step_id')->all(),
            'notes' => self::notes($userId),
            'minutes' => $preferences?->focus_minutes ?? 25,
        ];
    }

    /** @return list<string> */
    private static function markedRouteKeys(int $userId, string $kind): array
    {
        return DB::table('route_marks')->where('user_id', $userId)->where('kind', $kind)->where('marked', 1)
            ->orderByRaw(self::LEGACY_ORDER)->pluck('item_key')->all();
    }

    private static function notes(int $userId): stdClass
    {
        $stored = DB::table('route_notes')->where('user_id', $userId)->get()
            ->mapWithKeys(fn (stdClass $note) => ["{$note->language}.{$note->field}" => $note->body]);

        $notes = new stdClass;
        foreach (self::LANGUAGES as $language) {
            $notes->{$language} = new stdClass;
            foreach (self::NOTE_FIELDS as $field) {
                $notes->{$language}->{$field} = $stored["{$language}.{$field}"] ?? '';
            }
        }

        return $notes;
    }

    private static function lab(int $userId): stdClass
    {
        $preferences = DB::table('preferences')->where('user_id', $userId)->first();
        $records = [];
        foreach (DB::table('exercise_progress')->where('user_id', $userId)->get() as $row) {
            $records[$row->exercise_id] = self::exerciseRecord($userId, $row);
        }

        return (object) [
            'version' => 1,
            'records' => (object) $records,
            'selected' => (object) ['rust' => $preferences?->lab_selected_rust, 'go' => $preferences?->lab_selected_go],
        ];
    }

    private static function exerciseRecord(int $userId, stdClass $row): stdClass
    {
        $draft = DB::table('drafts')->where('user_id', $userId)->where('exercise_id', $row->exercise_id)->value('code');
        $optional = [
            'prediction' => $row->prediction_answer,
            'hints' => $row->hints_revealed,
            'draft' => $draft,
            'reflection' => $row->reflection,
            'customTest' => $row->custom_test,
            'attempts' => $row->legacy_attempts,
            'solvedAt' => self::milliseconds($row->solved_at),
            'reviewAt' => self::milliseconds($row->review_due_at),
            'reviewedAt' => self::milliseconds($row->reviewed_at),
            'confidence' => $row->confidence,
            'result' => $row->last_attempt_id === null ? null : self::result((int) $row->last_attempt_id),
        ];

        return (object) [
            'predictionCorrect' => (bool) $row->prediction_correct,
            'assisted' => (bool) $row->assisted,
            'solutionSeen' => (bool) $row->solution_seen,
            ...array_filter($optional, fn (mixed $value) => $value !== null),
        ];
    }

    private static function result(int $attemptId): stdClass
    {
        $attempt = DB::table('attempts')->where('id', $attemptId)->first();
        $payload = DB::table('attempt_payloads')->where('attempt_id', $attemptId)->first();
        $tests = [];
        foreach (DB::table('attempt_tests')->where('attempt_id', $attemptId)->orderBy('position')->get() as $test) {
            $tests[] = (object) ['id' => $test->test_key, 'passed' => $test->outcome === 'pass'];
        }

        return (object) [
            'code' => $payload->code,
            'success' => $attempt->outcome === 'passed',
            'stdout' => $payload->stdout,
            'stderr' => $payload->stderr,
            'transportError' => $attempt->outcome === 'legacy_error',
            'tests' => $tests,
            'time' => self::milliseconds($attempt->attempted_at),
            'customTest' => $payload->custom_test ?? '',
            'customPassed' => $attempt->custom_outcome === 'pass',
        ];
    }

    private static function campaign(int $userId): stdClass
    {
        $seals = [];
        foreach (DB::table('campaign_seals')->where('user_id', $userId)->get() as $seal) {
            $seals[$seal->exercise_id] = (object) ['code' => (bool) $seal->code, 'prediction' => (bool) $seal->prediction, 'assisted' => (bool) $seal->assisted];
        }
        $checkpoints = [];
        foreach (DB::table('campaign_checkpoints')->where('user_id', $userId)->get() as $checkpoint) {
            $checkpoints[$checkpoint->world_id] = (object) ['passed' => (bool) $checkpoint->passed, 'lastAnswer' => $checkpoint->last_answer];
        }

        return (object) ['version' => 1, 'seals' => (object) $seals, 'checkpoints' => (object) $checkpoints];
    }

    private static function systems(int $userId): stdClass
    {
        $records = [];
        foreach (DB::table('workshop_progress')->where('user_id', $userId)->get() as $row) {
            $records["{$row->language}:{$row->workshop_id}"] = self::workshopRecord($userId, $row);
        }

        return (object) ['version' => 1, 'records' => (object) $records];
    }

    private static function workshopRecord(int $userId, stdClass $row): stdClass
    {
        $identity = ['user_id' => $userId, 'workshop_id' => $row->workshop_id, 'language' => $row->language];

        return (object) [
            'observed' => DB::table('workshop_observations')->where($identity)->orderByRaw(self::LEGACY_ORDER)->pluck('objective_key')->all(),
            'code' => (bool) $row->code_sealed,
            'predicted' => (bool) $row->prediction_correct,
            'answer' => $row->answer,
            'steps' => self::markedStepPositions($identity),
            'note' => $row->note ?? '',
        ];
    }

    /**
     * @param  array{user_id: int, workshop_id: string, language: string}  $identity
     * @return list<int>
     */
    private static function markedStepPositions(array $identity): array
    {
        $positions = [];
        $marks = DB::table('workshop_step_marks as marks')
            ->join('workshop_steps as steps', fn ($join) => $join->on('steps.workshop_id', '=', 'marks.workshop_id')->on('steps.step_key', '=', 'marks.step_key'))
            ->where('marks.user_id', $identity['user_id'])->where('marks.workshop_id', $identity['workshop_id'])->where('marks.language', $identity['language'])
            ->where('marks.marked', 1)->whereNotNull('steps.v1_position')
            ->orderByRaw('marks.legacy_position IS NULL, marks.legacy_position, marks.created_at')
            ->select('steps.v1_position')->get();
        foreach ($marks as $mark) {
            $positions[] = (int) $mark->v1_position;
        }

        return $positions;
    }

    private static function milliseconds(?string $datetime): ?int
    {
        if ($datetime === null) {
            return null;
        }

        return (int) Instant::parse($datetime)->format('Uv');
    }
}
