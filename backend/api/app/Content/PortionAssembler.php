<?php

namespace App\Content;

use App\Content\Record\AtlasConcept;
use App\Content\Record\Exercise;
use App\Content\Record\ExerciseHint;
use App\Content\Record\ExerciseTest;
use App\Content\Record\Guide;
use App\Content\Record\GuideModule;
use App\Content\Record\GuideResource;
use App\Content\Record\GuideSource;
use App\Content\Record\GuideStep;
use App\Content\Record\GuideStepResource;
use App\Content\Record\GuideTrack;
use App\Content\Record\RowFields;
use App\Content\Record\Topic;
use App\Content\Record\Workshop;
use App\Content\Record\WorkshopObjective;
use App\Content\Record\WorkshopRelatedExercise;
use App\Content\Record\WorkshopStep;
use App\Content\Record\World;
use App\Content\Record\WorldExercise;
use Closure;
use LogicException;
use stdClass;

/**
 * The rows → the bytes of a portion: the only path from the tables to what the API publishes
 * (ADR 0006 D10). It is pure and never reads the database, so the same code assembles a portion
 * from rows the import has just computed (in tests) and from rows read from the database. It sorts
 * by `position` and filters by portion: any row that is not its own is ignored.
 */
final class PortionAssembler
{
    /**
     * @param  array<string, list<array<string, mixed>>>  $rows  active rows by table
     * @param  list<string>  $languages  in the order of `languages.position`
     */
    public function assemble(Portion $portion, array $rows, array $languages): string
    {
        return PublishedJson::encode(match ($portion->group()) {
            'lab', 'quests', 'cores' => $this->exerciseList($portion, $rows),
            'workshops' => $this->workshopList($portion, $rows, $languages),
            'campaign' => $this->worldList($portion, $rows),
            'atlas' => $this->atlasList($portion, $rows),
            'guide' => $this->guide($rows, $languages)->toPublished(),
            default => throw new LogicException("Grupo de porción desconocido: {$portion->group()}"),
        });
    }

    /**
     * @param  array<string, mixed>  $exercise  an `exercises` row
     * @param  list<array<string, mixed>>  $tests  the exercise's `exercise_tests` rows
     * @param  list<array<string, mixed>>  $hints  the exercise's `exercise_hints` rows
     * @param  ?array<string, mixed>  $topic  the exercise's `topics` row
     */
    public function exercise(array $exercise, array $tests, array $hints, ?array $topic): Exercise
    {
        if ($topic === null) {
            $fields = new RowFields($exercise, 'exercises');
            throw new LogicException("topics: no hay un tema activo {$fields->string('language')}|{$fields->string('topic_key')} para el ejercicio {$fields->string('id')}");
        }
        $testRecords = [];
        foreach ($tests as $test) {
            $testRecords[] = ExerciseTest::fromRow($test);
        }
        $hintRecords = [];
        foreach ($hints as $hint) {
            $hintRecords[] = ExerciseHint::fromRow($hint);
        }

        return Exercise::fromRow($exercise, $testRecords, $hintRecords, Topic::fromRow($topic));
    }

    /**
     * @param  array<string, list<array<string, mixed>>>  $rows
     * @return list<stdClass>
     */
    private function exerciseList(Portion $portion, array $rows): array
    {
        $tests = $this->rowsByParent($rows['exercise_tests'], 'exercise_tests', 'exercise_id');
        $hints = $this->rowsByParent($rows['exercise_hints'], 'exercise_hints', 'exercise_id');
        $topics = [];
        foreach ($rows['topics'] as $row) {
            $topic = Topic::fromRow($row);
            $topics["{$topic->language}|{$topic->topicKey}"] = $row;
        }

        $exercises = [];
        foreach ($rows['exercises'] as $row) {
            $fields = new RowFields($row, 'exercises');
            $exercise = $this->exercise(
                $row,
                $tests[$fields->string('id')] ?? [],
                $hints[$fields->string('id')] ?? [],
                $topics["{$fields->string('language')}|{$fields->string('topic_key')}"] ?? null,
            );
            $slice = $portion->group() === 'cores' ? $exercise->domain : $exercise->language;
            if ($exercise->catalog === $portion->group() && $slice === $portion->slice()) {
                $exercises[] = $exercise;
            }
        }
        usort($exercises, fn (Exercise $a, Exercise $b) => $a->position <=> $b->position);

        $published = [];
        foreach ($exercises as $exercise) {
            $published[] = $exercise->toPublished();
        }

        return $published;
    }

    /**
     * @param  array<string, list<array<string, mixed>>>  $rows
     * @param  list<string>  $languages
     * @return list<stdClass>
     */
    private function workshopList(Portion $portion, array $rows, array $languages): array
    {
        $objectives = $this->rowsByParent($rows['workshop_objectives'], 'workshop_objectives', 'workshop_id');
        $steps = $this->rowsByParent($rows['workshop_steps'], 'workshop_steps', 'workshop_id');
        $related = $this->rowsByParent($rows['workshop_related_exercises'], 'workshop_related_exercises', 'workshop_id');
        $languageOf = [];
        $codeOf = [];
        foreach ($rows['exercises'] as $row) {
            $fields = new RowFields($row, 'exercises');
            $languageOf[$fields->string('id')] = $fields->string('language');
            $workshopId = $fields->nullableString('workshop_id');
            if ($workshopId !== null) {
                $codeOf[$workshopId][$fields->string('language')] = $fields->string('id');
            }
        }

        $workshops = [];
        foreach ($rows['workshops'] as $row) {
            $id = (new RowFields($row, 'workshops'))->string('id');
            $relatedByLanguage = [];
            foreach ($related[$id] ?? [] as $link) {
                $relatedExercise = WorkshopRelatedExercise::fromRow($link);
                $language = $languageOf[$relatedExercise->exerciseId]
                    ?? throw new LogicException("exercises: no hay un ejercicio activo {$relatedExercise->exerciseId} para el taller {$id}");
                $relatedByLanguage[$language][] = $relatedExercise;
            }
            $workshop = Workshop::fromRow(
                $row,
                $this->records($objectives[$id] ?? [], WorkshopObjective::fromRow(...)),
                $this->records($steps[$id] ?? [], WorkshopStep::fromRow(...)),
                $relatedByLanguage,
                $codeOf[$id] ?? [],
                $languages,
            );
            if ($workshop->domain === $portion->slice()) {
                $workshops[] = $workshop;
            }
        }
        usort($workshops, fn (Workshop $a, Workshop $b) => $a->position <=> $b->position);

        $published = [];
        foreach ($workshops as $workshop) {
            $published[] = $workshop->toPublished();
        }

        return $published;
    }

    /**
     * @param  array<string, list<array<string, mixed>>>  $rows
     * @return list<stdClass>
     */
    private function worldList(Portion $portion, array $rows): array
    {
        $members = $this->rowsByParent($rows['world_exercises'], 'world_exercises', 'world_id');

        $worlds = [];
        foreach ($rows['worlds'] as $row) {
            $id = (new RowFields($row, 'worlds'))->string('id');
            $world = World::fromRow($row, $this->records($members[$id] ?? [], WorldExercise::fromRow(...)));
            if ($world->language === $portion->slice()) {
                $worlds[] = $world;
            }
        }
        usort($worlds, fn (World $a, World $b) => $a->position <=> $b->position);

        $published = [];
        foreach ($worlds as $world) {
            $published[] = $world->toPublished();
        }

        return $published;
    }

    /**
     * @param  array<string, list<array<string, mixed>>>  $rows
     * @return list<stdClass>
     */
    private function atlasList(Portion $portion, array $rows): array
    {
        $concepts = [];
        foreach ($rows['atlas_concepts'] as $row) {
            $concept = AtlasConcept::fromRow($row);
            if ($concept->language === $portion->slice()) {
                $concepts[] = $concept;
            }
        }
        usort($concepts, fn (AtlasConcept $a, AtlasConcept $b) => $a->position <=> $b->position);

        $published = [];
        foreach ($concepts as $concept) {
            $published[] = $concept->toPublished();
        }

        return $published;
    }

    /**
     * @param  array<string, list<array<string, mixed>>>  $rows
     * @param  list<string>  $languages
     */
    private function guide(array $rows, array $languages): Guide
    {
        $links = $this->rowsByParent($rows['guide_step_resources'], 'guide_step_resources', 'step_id');
        $steps = $this->rowsByParent($rows['guide_steps'], 'guide_steps', 'module_id');
        $modules = $this->rowsByParent($rows['guide_modules'], 'guide_modules', 'track_language');

        $tracks = [];
        foreach ($languages as $language) {
            $moduleRecords = [];
            foreach ($modules[$language] ?? [] as $moduleRow) {
                $moduleId = (new RowFields($moduleRow, 'guide_modules'))->string('id');
                $stepRecords = [];
                foreach ($steps[$moduleId] ?? [] as $stepRow) {
                    $stepId = (new RowFields($stepRow, 'guide_steps'))->string('id');
                    $stepRecords[] = GuideStep::fromRow($stepRow, $this->records($links[$stepId] ?? [], GuideStepResource::fromRow(...)));
                }
                $moduleRecords[] = GuideModule::fromRow($moduleRow, $stepRecords);
            }
            $tracks[$language] = GuideTrack::fromRow($this->trackRow($rows['guide_tracks'], $language), $moduleRecords);
        }

        return new Guide(
            $this->records($this->byPosition($rows['guide_resources'], 'guide_resources'), GuideResource::fromRow(...)),
            $tracks,
            $this->records($this->byPosition($rows['guide_sources'], 'guide_sources'), GuideSource::fromRow(...)),
        );
    }

    /**
     * @param  list<array<string, mixed>>  $rows  `guide_tracks` rows
     * @return array<string, mixed>
     */
    private function trackRow(array $rows, string $language): array
    {
        foreach ($rows as $row) {
            if ((new RowFields($row, 'guide_tracks'))->string('language') === $language) {
                return $row;
            }
        }

        throw new InvalidContent("guide_tracks: no hay una fila activa con language = {$language}");
    }

    /**
     * @template TRecord
     *
     * @param  list<array<string, mixed>>  $rows
     * @param  Closure(array<string, mixed>): TRecord  $fromRow
     * @return list<TRecord>
     */
    private function records(array $rows, Closure $fromRow): array
    {
        $records = [];
        foreach ($rows as $row) {
            $records[] = $fromRow($row);
        }

        return $records;
    }

    /**
     * The rows grouped by the value of the parent column, each group ordered by `position`.
     *
     * @param  list<array<string, mixed>>  $rows
     * @return array<string, list<array<string, mixed>>>
     */
    private function rowsByParent(array $rows, string $table, string $parentColumn): array
    {
        $groups = [];
        foreach ($this->byPosition($rows, $table) as $row) {
            $groups[(new RowFields($row, $table))->string($parentColumn)][] = $row;
        }

        return $groups;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return list<array<string, mixed>>
     */
    private function byPosition(array $rows, string $table): array
    {
        usort($rows, fn (array $a, array $b) => (new RowFields($a, $table))->int('position') <=> (new RowFields($b, $table))->int('position'));

        return $rows;
    }
}
