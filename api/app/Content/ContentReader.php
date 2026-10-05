<?php

namespace App\Content;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * The active rows a portion (or an exercise) needs, read with the current connection: the import
 * reads them inside its transaction and the delivery inside a read-only snapshot (ContentSnapshot).
 * It assembles nothing: that is PortionAssembler's job. Rows come ordered by `position` and, to
 * break ties, by the binary primary key (data-model.md).
 */
final class ContentReader
{
    private const GUIDE_TABLES = ['guide_resources', 'guide_sources', 'guide_tracks', 'guide_modules', 'guide_steps', 'guide_step_resources'];

    /** The tables with a `position` column (in `exercise_hints` and `guide_sources` it is part of the primary key). */
    private const POSITIONED = [...ContentTables::NULL_POSITION_WHEN_RETIRED, 'exercise_hints', 'guide_sources'];

    /** @return list<string> the languages, in the order of `languages.position` */
    public function languages(): array
    {
        return DB::table('languages')->orderBy('position')->orderBy('code')->pluck('code')->all();
    }

    /** @return array<string, list<array<string, mixed>>> */
    public function rows(Portion $portion): array
    {
        return match ($portion->group()) {
            'lab', 'quests', 'cores' => $this->exerciseRows($portion),
            'workshops' => $this->workshopRows($portion),
            'campaign' => $this->worldRows($portion),
            'atlas' => ['atlas_concepts' => $this->get($this->active('atlas_concepts')->where('language', $portion->slice()))],
            'guide' => array_combine(self::GUIDE_TABLES, array_map(fn (string $table) => $this->get($this->active($table)), self::GUIDE_TABLES)),
        };
    }

    /**
     * An active exercise with its tests, its hints and the label of its topic; null if it does not
     * exist or is retired.
     *
     * @return ?array{exercise: array<string, mixed>, tests: list<array<string, mixed>>, hints: list<array<string, mixed>>, topic: string}
     */
    public function exercise(string $id): ?array
    {
        $exercise = $this->get($this->active('exercises')->where('id', $id))[0] ?? null;
        if ($exercise === null) {
            return null;
        }
        $topic = $this->active('topics')->where('language', $exercise['language'])->where('topic_key', $exercise['topic_key'])->value('label');

        return [
            'exercise' => $exercise,
            'tests' => $this->get($this->active('exercise_tests')->where('exercise_id', $id)),
            'hints' => $this->get($this->active('exercise_hints')->where('exercise_id', $id)),
            'topic' => (string) $topic,
        ];
    }

    /** @return array<string, list<array<string, mixed>>> */
    private function exerciseRows(Portion $portion): array
    {
        $column = $portion->group() === 'cores' ? 'domain' : 'language';
        $exercises = $this->get($this->active('exercises')->where('catalog', $portion->group())->where($column, $portion->slice()));
        $ids = array_column($exercises, 'id');

        return [
            'exercises' => $exercises,
            'exercise_tests' => $this->get($this->active('exercise_tests')->whereIn('exercise_id', $ids)),
            'exercise_hints' => $this->get($this->active('exercise_hints')->whereIn('exercise_id', $ids)),
            'topics' => $this->get($this->active('topics')->whereIn('language', array_values(array_unique(array_column($exercises, 'language'))))),
        ];
    }

    /** @return array<string, list<array<string, mixed>>> */
    private function workshopRows(Portion $portion): array
    {
        $workshops = $this->get($this->active('workshops')->where('domain', $portion->slice()));
        $ids = array_column($workshops, 'id');
        $related = $this->get($this->active('workshop_related_exercises')->whereIn('workshop_id', $ids));
        // Of the exercises only the language is needed and, for the cores, their workshop.
        $exercises = $this->get(
            $this->active('exercises')
                ->select(['id', 'language', 'workshop_id'])
                ->where(fn (Builder $query) => $query->whereIn('workshop_id', $ids)->orWhereIn('id', array_column($related, 'exercise_id'))),
        );

        return [
            'workshops' => $workshops,
            'workshop_objectives' => $this->get($this->active('workshop_objectives')->whereIn('workshop_id', $ids)),
            'workshop_steps' => $this->get($this->active('workshop_steps')->whereIn('workshop_id', $ids)),
            'workshop_related_exercises' => $related,
            'exercises' => $exercises,
        ];
    }

    /** @return array<string, list<array<string, mixed>>> */
    private function worldRows(Portion $portion): array
    {
        $worlds = $this->get($this->active('worlds')->where('language', $portion->slice()));

        return [
            'worlds' => $worlds,
            'world_exercises' => $this->get($this->active('world_exercises')->whereIn('world_id', array_column($worlds, 'id'))),
        ];
    }

    private function active(string $table): Builder
    {
        $order = in_array($table, self::POSITIONED, true) ? ['position', ...ContentTables::KEYS[$table]] : ContentTables::KEYS[$table];
        $query = DB::table($table)->where('status', 'active');
        foreach (array_unique($order) as $column) {
            $query->orderBy($column);
        }

        return $query;
    }

    /** @return list<array<string, mixed>> */
    private function get(Builder $query): array
    {
        return $query->get()->map(fn (object $row) => (array) $row)->all();
    }
}
