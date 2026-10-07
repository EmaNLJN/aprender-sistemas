<?php

namespace App\Progress\Snapshot;

use App\Content\ContentSnapshot;
use App\Progress\ChangesReader;
use App\Progress\ProgressAreas;
use App\Progress\ProgressHead;
use Closure;
use Illuminate\Support\Facades\DB;

final class ProgressSnapshotReader implements ChangesReader
{
    private const EXERCISES_WITH_ATTEMPTS = <<<'SQL'
        select ep.*, e.grading_hash as current_grading_hash,
               pa.outcome as proof_outcome, pa.legacy as proof_legacy, pa.grading_hash as proof_grading_hash,
               la.outcome as last_outcome, la.legacy as last_legacy
        from exercise_progress ep
        join exercises e on e.id = ep.exercise_id
        left join attempts pa on pa.id = ep.proof_attempt_id and pa.user_id = ep.user_id and pa.exercise_id = ep.exercise_id
        left join attempts la on la.id = ep.last_attempt_id and la.user_id = ep.user_id and la.exercise_id = ep.exercise_id
        where ep.user_id = ?
        SQL;

    public function areas(int $userId, ?int $sinceRevision): ProgressAreas
    {
        return new ProgressAreas(
            exercises: $this->exercises($userId, $sinceRevision),
            drafts: $this->wire('drafts', $userId, $sinceRevision, 'exercise_id', DraftWire::of(...)),
            campaignSeals: $this->wire('campaign_seals', $userId, $sinceRevision, 'exercise_id', CampaignWire::seal(...)),
            campaignCheckpoints: $this->wire('campaign_checkpoints', $userId, $sinceRevision, 'world_id', CampaignWire::checkpoint(...)),
            workshopProgress: $this->wire('workshop_progress', $userId, $sinceRevision, 'workshop_id, language', WorkshopWire::progress(...)),
            workshopObjectives: $this->wire('workshop_observations', $userId, $sinceRevision, 'workshop_id, language, objective_key', WorkshopWire::objective(...)),
            workshopSteps: $this->wire('workshop_step_marks', $userId, $sinceRevision, 'workshop_id, language, step_key', WorkshopWire::step(...)),
            routeMarks: $this->wire('route_marks', $userId, $sinceRevision, 'kind, item_key', RouteWire::mark(...)),
            routeQuiz: $this->wire('route_quiz_answers', $userId, $sinceRevision, 'step_id', RouteWire::quiz(...)),
            routeNotes: $this->wire('route_notes', $userId, $sinceRevision, 'language, field', RouteWire::note(...)),
            preferences: $this->preferences($userId, $sinceRevision),
        );
    }

    /** @param Closure(string): bool $matches */
    public function read(int $userId, string $contentVersion, Closure $matches): Snapshot|NotModified
    {
        return ContentSnapshot::read(function () use ($userId, $contentVersion, $matches): Snapshot|NotModified {
            $head = $this->head($userId);
            $etag = ProgressEtag::of($userId, $head->epoch, $head->revision, $contentVersion);
            if ($matches($etag)) {
                return new NotModified($etag);
            }

            return new Snapshot($userId, $head->epoch, $head->revision, $head->resetAt, $contentVersion, $this->areas($userId, null));
        });
    }

    private function head(int $userId): ProgressHead
    {
        $row = DB::selectOne('select * from `progress_heads` where `user_id` = ?', [$userId]);

        return is_object($row) ? ProgressHead::fromRow(get_object_vars($row)) : new ProgressHead($userId, 1, 0, null, null);
    }

    /** @return list<array<string, mixed>> */
    private function exercises(int $userId, ?int $sinceRevision): array
    {
        $sql = self::EXERCISES_WITH_ATTEMPTS.($sinceRevision === null ? '' : ' and ep.revision > ?').' order by ep.exercise_id';
        $rows = $this->select($sql, $sinceRevision === null ? [$userId] : [$userId, $sinceRevision]);

        $attemptIds = [];
        foreach ($rows as $row) {
            foreach (['proof_attempt_id', 'last_attempt_id'] as $column) {
                if (is_numeric($row[$column])) {
                    $attemptIds[] = (int) $row[$column];
                }
            }
        }
        $verdicts = $this->verdictsByAttempt($attemptIds);

        $exercises = [];
        foreach ($rows as $row) {
            $exercises[] = ExerciseWire::of($row, $verdicts);
        }

        return $exercises;
    }

    /**
     * @param  list<int>  $attemptIds
     * @return array<int, list<array{testKey: string, outcome: string}>>
     */
    private function verdictsByAttempt(array $attemptIds): array
    {
        if ($attemptIds === []) {
            return [];
        }
        $rows = DB::table('attempt_tests')->whereIn('attempt_id', $attemptIds)->orderBy('attempt_id')->orderBy('position')->get(['attempt_id', 'test_key', 'outcome']);

        $verdicts = [];
        foreach ($rows as $row) {
            $verdicts[(int) $row->attempt_id][] = ['testKey' => (string) $row->test_key, 'outcome' => (string) $row->outcome];
        }

        return $verdicts;
    }

    /**
     * @param  Closure(array<string, mixed>): array<string, mixed>  $wire
     * @return list<array<string, mixed>>
     */
    private function wire(string $table, int $userId, ?int $sinceRevision, string $naturalKey, Closure $wire): array
    {
        $rows = $this->select(
            "select * from `{$table}` where `user_id` = ?".($sinceRevision === null ? '' : ' and `revision` > ?')." order by {$naturalKey}",
            $sinceRevision === null ? [$userId] : [$userId, $sinceRevision],
        );

        $wired = [];
        foreach ($rows as $row) {
            $wired[] = $wire($row);
        }

        return $wired;
    }

    /** @return ?array<string, mixed> */
    private function preferences(int $userId, ?int $sinceRevision): ?array
    {
        $rows = $this->wire('preferences', $userId, $sinceRevision, 'user_id', PreferencesWire::of(...));

        return $rows[0] ?? null;
    }

    /**
     * @param  list<int>  $bindings
     * @return list<array<string, mixed>>
     */
    private function select(string $sql, array $bindings): array
    {
        $rows = [];
        foreach (DB::select($sql, $bindings) as $row) {
            $rows[] = get_object_vars($row);
        }

        return $rows;
    }
}
