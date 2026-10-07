<?php

namespace App\Content;

use App\Content\Record\RowFields;
use Closure;
use Illuminate\Support\Arr;
use LogicException;

/**
 * The difference between the document (RowSet) and the tables, computed in PHP with strict
 * equality and never with MySQL's `=` on an `_ai_ci` collation. Which rows get written is decided
 * row by row, `key_order` included, so a change that only reorders keys is written too; the hashes
 * only classify the report.
 */
final class ContentDiff
{
    /**
     * @param  array<string, array<string, array<string, mixed>>>  $stored  rows by table and key (ContentStore::rows)
     * @param  array<string, bool>  $knownVersions  ContentStore::gradingVersions
     */
    public function between(RowSet $desired, array $stored, array $knownVersions, ?LatestImport $latest, ContentMeta $meta): ContentPlan
    {
        $this->assertDistinctV1Indexes($desired, $stored['workshop_steps'] ?? []);
        $writes = $this->rowsByTable(fn (string $table) => $this->rowsToWrite($table, $desired->keyed($table), $stored[$table] ?? [], $stored));
        $retires = $this->rowsByTable(fn (string $table) => $this->rowsToRetire($table, $desired->keyed($table), $stored[$table] ?? []));
        $versions = $this->newGradingVersions($desired, $knownVersions);
        $changesTables = $writes !== [] || $retires !== [] || $versions !== [];

        return new ContentPlan(
            $writes,
            $retires,
            $versions,
            $this->mustRecord($changesTables, $latest, $meta),
            $this->report($desired, $stored['exercises'] ?? [], $writes, $retires),
        );
    }

    /**
     * What `$rowsOf` returns for each table, in dependency order, leaving out the tables where it returns nothing.
     *
     * @template TRow of array<string, mixed>
     *
     * @param  Closure(string): list<TRow>  $rowsOf
     * @return array<string, list<TRow>>
     */
    private function rowsByTable(Closure $rowsOf): array
    {
        return collect(ContentTables::KEYS)->map(fn (array $keys, string $table) => $rowsOf($table))->filter()->all();
    }

    /**
     * @param  array<string, array<string, int|string|null>>  $wanted
     * @param  array<string, array<string, mixed>>  $have
     * @param  array<string, array<string, array<string, mixed>>>  $stored
     * @return list<array<string, int|string|null>>
     */
    private function rowsToWrite(string $table, array $wanted, array $have, array $stored): array
    {
        $hasLifecycle = ! in_array($table, ContentTables::WITHOUT_LIFECYCLE, true);
        $rows = [];
        foreach ($wanted as $key => $row) {
            $current = $have[$key] ?? null;
            if ($current === null) {
                $rows[] = $row;

                continue;
            }
            $this->assertFrozen($table, $row, $current);
            if ($hasLifecycle && $current['status'] !== 'active') {
                $this->assertMayReturn($table, $row, $current, $stored);
                $rows[] = $row;
            } elseif (! $this->same($row, $current)) {
                $rows[] = $row;
            }
        }

        return $rows;
    }

    /**
     * @param  array<string, array<string, int|string|null>>  $wanted
     * @param  array<string, array<string, mixed>>  $have
     * @return list<array<string, mixed>> the active stored rows that are no longer in the document
     */
    private function rowsToRetire(string $table, array $wanted, array $have): array
    {
        if (in_array($table, ContentTables::WITHOUT_LIFECYCLE, true)) {
            return [];
        }
        $rows = [];
        foreach ($have as $key => $current) {
            if ($current['status'] === 'active' && ! isset($wanted[$key])) {
                $rows[] = $current;
            }
        }

        return $rows;
    }

    /**
     * @param  array<string, bool>  $knownVersions
     * @return list<array{exercise_id: string, grading_hash: string}>
     */
    private function newGradingVersions(RowSet $desired, array $knownVersions): array
    {
        $versions = [];
        foreach ($desired->rows('exercises') as $exercise) {
            $fields = new RowFields($exercise, 'exercises');
            $id = $fields->string('id');
            $gradingHash = $fields->string('grading_hash');
            if (! isset($knownVersions["{$id}\x1f{$gradingHash}"])) {
                $versions[] = ['exercise_id' => $id, 'grading_hash' => $gradingHash];
            }
        }

        return $versions;
    }

    /**
     * An import leaves a record if the tables, the document or the hash of any portion change. A
     * different source commit with the same content does not count.
     */
    private function mustRecord(bool $changesTables, ?LatestImport $latest, ContentMeta $meta): bool
    {
        if ($changesTables || $latest === null || $latest->documentHash !== $meta->documentHash) {
            return true;
        }

        return collect($latest->portionHashes)->sortKeys()->all() !== collect($meta->portionHashes)->sortKeys()->all();
    }

    /**
     * A retired row only comes back if it was retired together with its exercise. A `test_key`
     * retired on its own is not reused (ADR 0006 D14): its results already point to the old test.
     *
     * @param  array<string, int|string|null>  $row
     * @param  array<string, mixed>  $current
     * @param  array<string, array<string, array<string, mixed>>>  $stored
     */
    private function assertMayReturn(string $table, array $row, array $current, array $stored): void
    {
        if ($table !== 'exercise_tests') {
            return;
        }
        $exercise = $stored['exercises'][(new RowFields($row, 'exercise_tests'))->string('exercise_id')] ?? null;
        $retiredTogether = $exercise !== null && $exercise['status'] !== 'active' && $exercise['retired_at'] === $current['retired_at'];
        if (! $retiredTogether) {
            throw InvalidContent::at('curriculum.json', "exercise_tests.{$row['exercise_id']}.{$row['test_key']}", 'el test_key se retiró y no se reutiliza: dale otra clave a la prueba nueva');
        }
    }

    /**
     * A v1 index belongs to a single step of its workshop (ADR 0006 D14): among the steps of the
     * document and, because a retired step keeps its own, among the stored steps the document no
     * longer has. The stored steps that stay are not compared here: assertFrozen compares each
     * one's index with the stored one.
     *
     * @param  array<string, array<string, mixed>>  $storedSteps  `workshop_steps` rows by key, in any status
     */
    private function assertDistinctV1Indexes(RowSet $desired, array $storedSteps): void
    {
        $steps = $desired->keyed('workshop_steps');
        $keptByLeavers = collect($storedSteps)
            ->diffKeys($steps)
            ->filter(fn (array $leaver) => $leaver['v1_position'] !== null)
            ->mapWithKeys(fn (array $leaver) => [$this->v1Slot($leaver) => (new RowFields($leaver, 'workshop_steps'))->string('step_key')])
            ->all();
        $owners = [];
        foreach ($steps as $step) {
            if ($step['v1_position'] === null) {
                continue;
            }
            $slot = $this->v1Slot($step);
            $at = "workshopSteps.{$step['workshop_id']}.{$step['step_key']}";
            if (isset($owners[$slot])) {
                throw InvalidContent::at('curriculum.meta.json', $at, "el v1Index {$step['v1_position']} ya es el de la etapa {$owners[$slot]}");
            }
            if (isset($keptByLeavers[$slot])) {
                throw InvalidContent::at('curriculum.meta.json', $at, "el v1Index {$step['v1_position']} ya es el de la etapa {$keptByLeavers[$slot]}, que lo conserva aunque se retire");
            }
            $owners[$slot] = $step['step_key'];
        }
    }

    /** @param array<string, mixed> $step */
    private function v1Slot(array $step): string
    {
        $fields = new RowFields($step, 'workshop_steps');

        return $fields->string('workshop_id')."\x1f".$fields->int('v1_position');
    }

    /**
     * The v1 index of a step is frozen: it neither changes nor is reassigned (ADR 0006 D14).
     *
     * @param  array<string, int|string|null>  $row
     * @param  array<string, mixed>  $current
     */
    private function assertFrozen(string $table, array $row, array $current): void
    {
        if ($table !== 'workshop_steps') {
            return;
        }
        $was = $this->normalized($current['v1_position']);
        $now = $this->normalized($row['v1_position']);
        if ($was !== $now) {
            throw InvalidContent::at('curriculum.meta.json', "workshopSteps.{$row['workshop_id']}.{$row['step_key']}", 'el v1Index está congelado: era '.($was ?? 'ninguno').' y llega '.($now ?? 'ninguno'));
        }
    }

    /**
     * @param  array<string, int|string|null>  $row
     * @param  array<string, mixed>  $current
     */
    private function same(array $row, array $current): bool
    {
        foreach ($row as $column => $value) {
            if ($this->normalized($value) !== $this->normalized($current[$column] ?? null)) {
                return false;
            }
        }

        return true;
    }

    /** MySQL gives back integers or strings depending on the driver; the comparison is on text. */
    private function normalized(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        if (is_int($value) || is_string($value)) {
            return (string) $value;
        }
        throw new LogicException('Una columna de contenido trae '.get_debug_type($value).': se esperaba un texto, un entero o NULL.');
    }

    /**
     * An exercise is reported as changed by its hashes, not by the rows written: a position that
     * moves because another exercise came or went rewrites the row but changes no published byte.
     *
     * @param  array<string, array<string, mixed>>  $storedExercises
     * @param  array<string, list<array<string, int|string|null>>>  $writes
     * @param  array<string, list<array<string, mixed>>>  $retires
     */
    private function report(RowSet $desired, array $storedExercises, array $writes, array $retires): ContentReport
    {
        $new = $gradingChanged = $textChanged = $reactivated = [];
        $incoming = $desired->keyed('exercises');
        foreach ($incoming as $id => $exercise) {
            $current = $storedExercises[$id] ?? null;
            if ($current === null) {
                $new[] = $id;
            } elseif ($current['status'] !== 'active') {
                $reactivated[] = $id;
            } elseif ($this->normalized($current['grading_hash']) !== $this->normalized($exercise['grading_hash'])) {
                $gradingChanged[] = $id;
            } elseif ($this->normalized($current['content_hash']) !== $this->normalized($exercise['content_hash'])) {
                $textChanged[] = $id;
            }
        }
        $retired = [];
        foreach ($storedExercises as $id => $current) {
            if ($current['status'] === 'active' && ! isset($incoming[$id])) {
                $retired[] = $id;
            }
        }

        return new ContentReport(
            $new,
            $gradingChanged,
            $textChanged,
            $retired,
            $reactivated,
            $this->countRows($writes),
            $this->countRows($retires),
            $this->countRows($desired->toArray()),
        );
    }

    /**
     * @param  array<string, list<mixed>>  $rowsByTable
     * @return array<string, int>
     */
    private function countRows(array $rowsByTable): array
    {
        return Arr::map($rowsByTable, fn (array $rows) => count($rows));
    }
}
