<?php

namespace App\Progress\Import;

use App\Progress\Import\Legacy\ContentFacts;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use stdClass;

final class ImportContent
{
    private const IDS_PER_QUERY = 10000;

    /** @param  array<array-key, mixed>  $normalized */
    public function factsFor(array $normalized): ContentFacts
    {
        $route = $this->section($normalized, 'route');
        $lab = $this->section($normalized, 'lab');
        $campaign = $this->section($normalized, 'campaign');
        $systems = $this->section($normalized, 'systems');

        $exerciseIds = [
            ...$this->keysOf($lab['records'] ?? null),
            ...$this->keysOf($campaign['seals'] ?? null),
            ...$this->stringsOf(Arr::get($lab, 'selected.rust')),
            ...$this->stringsOf(Arr::get($lab, 'selected.go')),
        ];
        $workshopIds = $this->workshopIds($this->keysOf($systems['records'] ?? null));
        $stepIds = [...$this->stringsOf($route['completed'] ?? null), ...$this->keysOf($route['quizAnswers'] ?? null)];

        return new ContentFacts(
            exercises: $this->exercises($exerciseIds),
            checkpointOptions: $this->optionCounts('worlds', 'checkpoint_json', $this->keysOf($campaign['checkpoints'] ?? null)),
            workshops: $this->workshops($workshopIds),
            quizOptions: $this->optionCounts('guide_steps', 'quiz_json', $stepIds),
            resources: $this->resources($this->stringsOf($route['favorites'] ?? null)),
        );
    }

    /**
     * @param  array<array-key, mixed>  $normalized
     * @return array<array-key, mixed>
     */
    private function section(array $normalized, string $name): array
    {
        $section = $normalized[$name] ?? null;

        return is_array($section) ? $section : [];
    }

    /** @return list<string> */
    private function keysOf(mixed $value): array
    {
        if (! is_array($value) || array_is_list($value)) {
            return [];
        }

        return array_map(fn (int|string $key) => (string) $key, array_keys($value));
    }

    /** @return list<string> */
    private function stringsOf(mixed $value): array
    {
        if (is_string($value)) {
            return [$value];
        }
        if (! is_array($value)) {
            return [];
        }

        return array_values(array_filter($value, is_string(...)));
    }

    /**
     * @param  list<string>  $names
     * @return list<string>
     */
    private function workshopIds(array $names): array
    {
        $ids = [];
        foreach ($names as $name) {
            $parts = explode(':', $name, 2);
            if (count($parts) === 2) {
                $ids[] = $parts[1];
            }
        }

        return $ids;
    }

    /**
     * @param  list<string>  $ids
     * @return array<string, array{language: string, predictionOptions: int, activeHints: int, testKeys: list<string>}>
     */
    private function exercises(array $ids): array
    {
        $rows = $this->rows('exercises', 'id', $ids, ['id', 'language', 'prediction_json']);
        $found = array_map(fn (stdClass $row) => (string) $row->id, $rows);
        $activeHints = $this->activeHints($found);
        $testKeys = $this->testKeys($found);

        $exercises = [];
        foreach ($rows as $row) {
            $id = (string) $row->id;
            $exercises[$id] = [
                'language' => (string) $row->language,
                'predictionOptions' => $this->optionCount((string) $row->prediction_json),
                'activeHints' => $activeHints[$id] ?? 0,
                'testKeys' => $testKeys[$id] ?? [],
            ];
        }

        return $exercises;
    }

    /**
     * @param  list<string>  $ids
     * @return array<string, int>
     */
    private function activeHints(array $ids): array
    {
        $counts = [];
        foreach (array_chunk($ids, self::IDS_PER_QUERY) as $chunk) {
            $rows = DB::table('exercise_hints')->whereIn('exercise_id', $chunk)->where('status', 'active')
                ->selectRaw('exercise_id, COUNT(*) AS total')->groupBy('exercise_id')->get();
            foreach ($rows as $row) {
                $counts[(string) $row->exercise_id] = (int) $row->total;
            }
        }

        return $counts;
    }

    /**
     * @param  list<string>  $ids
     * @return array<string, list<string>>
     */
    private function testKeys(array $ids): array
    {
        $keys = [];
        foreach ($this->rows('exercise_tests', 'exercise_id', $ids, ['exercise_id', 'test_key']) as $row) {
            $keys[(string) $row->exercise_id][] = (string) $row->test_key;
        }

        return $keys;
    }

    /**
     * @param  list<string>  $ids
     * @return array<string, array{predictionOptions: int, objectives: list<string>, stepsByV1Position: array<int, string>}>
     */
    private function workshops(array $ids): array
    {
        $rows = $this->rows('workshops', 'id', $ids, ['id', 'prediction_json']);
        $found = array_map(fn (stdClass $row) => (string) $row->id, $rows);
        $objectives = [];
        foreach ($this->rows('workshop_objectives', 'workshop_id', $found, ['workshop_id', 'objective_key']) as $row) {
            $objectives[(string) $row->workshop_id][] = (string) $row->objective_key;
        }
        $steps = [];
        foreach ($this->rows('workshop_steps', 'workshop_id', $found, ['workshop_id', 'step_key', 'v1_position'], 'v1_position') as $row) {
            $steps[(string) $row->workshop_id][(int) $row->v1_position] = (string) $row->step_key;
        }

        $workshops = [];
        foreach ($rows as $row) {
            $id = (string) $row->id;
            $workshops[$id] = [
                'predictionOptions' => $this->optionCount((string) $row->prediction_json),
                'objectives' => $objectives[$id] ?? [],
                'stepsByV1Position' => $steps[$id] ?? [],
            ];
        }

        return $workshops;
    }

    /**
     * @param  list<string>  $ids
     * @return array<string, int>
     */
    private function optionCounts(string $table, string $column, array $ids): array
    {
        $counts = [];
        foreach ($this->rows($table, 'id', $ids, ['id', $column]) as $row) {
            $counts[(string) $row->id] = $this->optionCount((string) $row->{$column});
        }

        return $counts;
    }

    /**
     * @param  list<string>  $ids
     * @return list<string>
     */
    private function resources(array $ids): array
    {
        return array_map(fn (stdClass $row) => (string) $row->id, $this->rows('guide_resources', 'id', $ids, ['id']));
    }

    /**
     * @param  list<string>  $ids
     * @param  list<string>  $columns
     * @return list<stdClass>
     */
    private function rows(string $table, string $keyColumn, array $ids, array $columns, ?string $notNullColumn = null): array
    {
        $rows = [];
        foreach (array_chunk(array_values(array_unique($ids)), self::IDS_PER_QUERY) as $chunk) {
            $query = DB::table($table)->whereIn($keyColumn, $chunk);
            if ($notNullColumn !== null) {
                $query->whereNotNull($notNullColumn);
            }
            foreach ($query->get($columns) as $row) {
                $rows[] = $row;
            }
        }

        return $rows;
    }

    private function optionCount(string $json): int
    {
        $decoded = json_decode($json, true);
        $options = is_array($decoded) ? ($decoded['options'] ?? null) : null;

        return is_array($options) ? count($options) : 0;
    }
}
