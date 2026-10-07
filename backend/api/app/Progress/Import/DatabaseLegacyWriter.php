<?php

namespace App\Progress\Import;

use App\Progress\Import\Legacy\LegacyCheckpoint;
use App\Progress\Import\Legacy\LegacyExercise;
use App\Progress\Import\Legacy\LegacyProgress;
use App\Progress\Import\Legacy\LegacyRoute;
use App\Progress\Import\Legacy\LegacyWorkshop;
use App\Progress\Merge\FieldWrite;
use App\Progress\Merge\SqlStatement;
use App\Progress\Merge\UpsertSql;
use App\Progress\Operations\FieldKinds;
use App\Runs\Record\Instant;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final class DatabaseLegacyWriter implements LegacyWriter
{
    private int $userId;

    private int $epoch;

    private int $revision;

    private CarbonImmutable $now;

    public function __construct(private readonly LegacyAttempts $attempts) {}

    public function write(int $userId, int $epoch, LegacyProgress $progress, int $revision, CarbonImmutable $now): WrittenRows
    {
        $session = clone $this;
        $session->userId = $userId;
        $session->epoch = $epoch;
        $session->revision = $revision;
        $session->now = $now;

        return $session->writeAll($progress);
    }

    private function writeAll(LegacyProgress $progress): WrittenRows
    {
        $counts = array_fill_keys(WrittenRows::AREAS, 0);

        $counts['preferences'] = $this->writePreferences($progress);
        if ($progress->route !== null) {
            $counts['routeMarks'] = $this->writeRouteMarks($progress->route);
            $counts['routeQuiz'] = $this->writeRouteQuiz($progress->route);
            $counts['routeNotes'] = $this->writeRouteNotes($progress->route);
        }
        foreach ($progress->exercises as $exercise) {
            $counts = $this->writeExercise($exercise, $counts);
        }
        foreach ($progress->seals as $seal) {
            $counts['campaignSeals'] += $this->changed(ImportSql::campaignSeal($this->userId, $seal, $this->revision, $this->now));
        }
        foreach ($progress->checkpoints as $checkpoint) {
            $counts['campaignCheckpoints'] += $this->writeCheckpoint($checkpoint);
        }
        foreach ($progress->workshops as $workshop) {
            $counts = $this->writeWorkshop($workshop, $counts);
        }

        return new WrittenRows($counts);
    }

    private function writePreferences(LegacyProgress $progress): int
    {
        $writes = [];
        if ($progress->route !== null) {
            $writes[] = $this->field('preference.routeLanguage', [$progress->route->language]);
            $writes[] = $this->field('preference.focusMinutes', [$progress->route->minutes]);
        }
        if ($progress->selected !== null && $progress->selected['rust'] !== null) {
            $writes[] = $this->field('preference.labSelectedRust', [$progress->selected['rust']]);
        }
        if ($progress->selected !== null && $progress->selected['go'] !== null) {
            $writes[] = $this->field('preference.labSelectedGo', [$progress->selected['go']]);
        }

        return $this->upsert([], $writes);
    }

    private function writeRouteMarks(LegacyRoute $route): int
    {
        $changed = 0;
        foreach (['step' => $route->completed, 'milestone' => $route->milestones, 'favorite' => $route->favorites] as $kind => $items) {
            foreach ($items as $position => $itemKey) {
                $changed += $this->writeMark('route_marks', ['kind' => $kind, 'item_key' => $itemKey], "route.mark.{$kind}", $position);
            }
        }

        return $changed;
    }

    private function writeRouteQuiz(LegacyRoute $route): int
    {
        $changed = 0;
        foreach ($route->quizAnswers as $stepId => $answer) {
            $changed += $this->upsert(['step_id' => $stepId], [$this->field('route.quiz', [$answer])]);
        }

        return $changed;
    }

    private function writeRouteNotes(LegacyRoute $route): int
    {
        $changed = 0;
        foreach ($route->notes as $language => $fields) {
            foreach ($fields as $field => $body) {
                if ($body !== '') {
                    $changed += $this->upsert(['language' => $language, 'field' => $field], [$this->field('route.note', [$body])]);
                }
            }
        }

        return $changed;
    }

    /**
     * @param  array<string, int>  $counts
     * @return array<string, int>
     */
    private function writeExercise(LegacyExercise $exercise, array $counts): array
    {
        $pointer = null;
        if ($exercise->result !== null) {
            $recorded = $this->attempts->record($this->userId, $this->epoch, $exercise->exerciseId, $exercise->result, $this->now);
            $pointer = $recorded->pointer;
            $counts['attempts'] += $recorded->inserted ? 1 : 0;
        }
        $key = ['exercise_id' => $exercise->exerciseId];
        $legacy = $this->changed(ImportSql::exerciseLegacy(
            $this->userId, $exercise->exerciseId, $exercise->solvedAt, $exercise->attempts, $pointer, $this->revision, $this->now,
        ));
        $fields = $this->upsert($key, $this->exerciseFields($exercise));
        $counts['exercises'] += $this->rowChanged($legacy, $fields);

        if ($exercise->draft !== null) {
            $counts['drafts'] += $this->upsert($key, [$this->field('exercise.draft', [$exercise->draft, null])]);
        }

        return $counts;
    }

    /** @return list<FieldWrite> */
    private function exerciseFields(LegacyExercise $exercise): array
    {
        $writes = [];
        if ($exercise->predictionCorrect) {
            $writes[] = $this->field('exercise.predictionCorrect', [1]);
        }
        if ($exercise->assisted) {
            $writes[] = $this->field('exercise.assisted', [1]);
        }
        if ($exercise->solutionSeen) {
            $writes[] = $this->field('exercise.solutionSeen', [1]);
        }
        if ($exercise->prediction !== null) {
            $writes[] = $this->field('exercise.prediction.answer', [$exercise->prediction]);
        }
        if ($exercise->hints !== null) {
            $writes[] = $this->field('exercise.hintsRevealed', [$exercise->hints]);
        }
        if ($exercise->reflection !== null) {
            $writes[] = $this->field('exercise.reflection', [$exercise->reflection]);
        }
        if ($exercise->customTest !== null) {
            $writes[] = $this->field('exercise.customTest', [$exercise->customTest]);
        }
        if ($exercise->confidence !== null || $exercise->reviewedAt !== null || $exercise->reviewAt !== null) {
            $writes[] = $this->field('exercise.review', [
                $exercise->confidence,
                $exercise->reviewedAt === null ? null : Instant::format($exercise->reviewedAt),
                $exercise->reviewAt === null ? null : Instant::format($exercise->reviewAt),
            ]);
        }

        return $writes;
    }

    private function writeCheckpoint(LegacyCheckpoint $checkpoint): int
    {
        $writes = [$this->field('checkpoint.passed', [$checkpoint->passed ? 1 : 0])];
        if ($checkpoint->lastAnswer !== null) {
            $writes[] = $this->field('checkpoint.lastAnswer', [$checkpoint->lastAnswer]);
        }

        return $this->upsert(['world_id' => $checkpoint->worldId], $writes);
    }

    /**
     * @param  array<string, int>  $counts
     * @return array<string, int>
     */
    private function writeWorkshop(LegacyWorkshop $workshop, array $counts): array
    {
        $parent = ['workshop_id' => $workshop->workshopId, 'language' => $workshop->language];
        $sealed = $this->changed(ImportSql::workshopSeal($this->userId, $workshop->workshopId, $workshop->language, $workshop->codeSealed, $this->revision, $this->now));
        $fields = $this->upsert($parent, $this->workshopFields($workshop));
        $counts['workshops'] += $this->rowChanged($sealed, $fields);

        foreach ($workshop->observed as $position => $objectiveKey) {
            $key = [...$parent, 'objective_key' => $objectiveKey];
            $counts['workshopObjectives'] += $this->writeMark('workshop_observations', $key, 'workshop.objective', $position, []);
        }
        foreach ($workshop->steps as $position => $stepKey) {
            $key = [...$parent, 'step_key' => $stepKey];
            $counts['workshopSteps'] += $this->writeMark('workshop_step_marks', $key, 'workshop.step', $position);
        }

        return $counts;
    }

    /** @return list<FieldWrite> */
    private function workshopFields(LegacyWorkshop $workshop): array
    {
        $writes = [];
        if ($workshop->predicted) {
            $writes[] = $this->field('workshop.predictionCorrect', [1]);
        }
        if ($workshop->answer !== null) {
            $writes[] = $this->field('workshop.answer', [$workshop->answer]);
        }
        if ($workshop->note !== '') {
            $writes[] = $this->field('workshop.note', [$workshop->note]);
        }

        return $writes;
    }

    /**
     * @param  array<string, string>  $key
     * @param  list<string|int|null>  $values
     */
    private function writeMark(string $table, array $key, string $kind, int $position, array $values = [1]): int
    {
        $marked = $this->upsert($key, [$this->field($kind, $values)]);
        $positioned = $this->changed(ImportSql::legacyPosition($table, $this->userId, $key, $position, $this->revision, $this->now));

        return $this->rowChanged($marked, $positioned);
    }

    /**
     * @param  array<string, string>  $key
     * @param  list<FieldWrite>  $writes
     */
    private function upsert(array $key, array $writes): int
    {
        if ($writes === []) {
            return 0;
        }

        return $this->changed(UpsertSql::row($this->userId, $key, $writes, $this->revision, $this->now));
    }

    private function rowChanged(int ...$statementsChanged): int
    {
        return max(0, ...$statementsChanged);
    }

    private function changed(SqlStatement $statement): int
    {
        return DB::affectingStatement($statement->sql, $statement->bindings) > 0 ? 1 : 0;
    }

    /** @param  list<string|int|null>  $values */
    private function field(string $kind, array $values): FieldWrite
    {
        return new FieldWrite(FieldKinds::definition($kind), $values, null);
    }
}
