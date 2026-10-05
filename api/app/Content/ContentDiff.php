<?php

namespace App\Content;

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
     * @param  array<string, true>  $knownVersions  ContentStore::gradingVersions
     * @param  array<string, mixed>  $meta  curriculum.meta.json
     */
    public function between(RowSet $desired, array $stored, array $knownVersions, ?LatestImport $latest, array $meta): ContentPlan
    {
        $writes = [];
        $retires = [];
        foreach (array_keys(ContentTables::KEYS) as $table) {
            $wanted = $desired->keyed($table);
            $have = $stored[$table] ?? [];
            $writes[$table] = $this->rowsToWrite($table, $wanted, $have, $stored);
            $retires[$table] = $this->rowsToRetire($table, $wanted, $have);
        }
        $writes = array_filter($writes);
        $retires = array_filter($retires);
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
     * @param  array<string, true>  $knownVersions
     * @return list<array{exercise_id: string, grading_hash: string}>
     */
    private function newGradingVersions(RowSet $desired, array $knownVersions): array
    {
        $versions = [];
        foreach ($desired->rows('exercises') as $exercise) {
            if (! isset($knownVersions["{$exercise['id']}\x1f{$exercise['grading_hash']}"])) {
                $versions[] = ['exercise_id' => $exercise['id'], 'grading_hash' => $exercise['grading_hash']];
            }
        }

        return $versions;
    }

    /**
     * An import leaves a record if the tables, the document or the hash of any portion change. A
     * different source commit with the same content does not count.
     *
     * @param  array<string, mixed>  $meta
     */
    private function mustRecord(bool $changesTables, ?LatestImport $latest, array $meta): bool
    {
        if ($changesTables || $latest === null || $latest->documentHash !== $meta['documentHash']) {
            return true;
        }
        $before = $latest->portionHashes;
        $after = $meta['portions'];
        ksort($before);
        ksort($after);

        return $before !== $after;
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
        $exercise = $stored['exercises'][$row['exercise_id']] ?? null;
        $retiredTogether = $exercise !== null && $exercise['status'] !== 'active' && $exercise['retired_at'] === $current['retired_at'];
        if (! $retiredTogether) {
            throw InvalidContent::at('curriculum.json', "exercise_tests.{$row['exercise_id']}.{$row['test_key']}", 'el test_key se retiró y no se reutiliza: usá uno nuevo');
        }
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
        return $value === null ? null : (string) $value;
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
            array_map('count', $writes),
            array_map('count', $retires),
            array_map('count', $desired->toArray()),
        );
    }
}
