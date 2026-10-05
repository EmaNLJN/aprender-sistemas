<?php

namespace App\Content;

use Illuminate\Support\Facades\DB;

/** What the content tables hold today, active or retired, to compute the difference. */
final class ContentStore
{
    /** @return array<string, array<string, array<string, mixed>>> rows by table and primary key */
    public function rows(): array
    {
        return collect(ContentTables::KEYS)->map(fn (array $keys, string $table) => $this->rowsOf($table))->all();
    }

    /** @return array<string, bool> "exercise\x1fhash" of every grading version that already applied */
    public function gradingVersions(): array
    {
        return DB::table('exercise_grading_versions')
            ->get(['exercise_id', 'grading_hash'])
            ->mapWithKeys(fn (object $row) => ["{$row->exercise_id}\x1f{$row->grading_hash}" => true])
            ->all();
    }

    /** @return array<string, array<string, mixed>> the rows of a table by primary key */
    private function rowsOf(string $table): array
    {
        return DB::table($table)
            ->get()
            ->map(fn (object $row) => (array) $row)
            ->keyBy(fn (array $row) => ContentTables::keyOf($table, $row))
            ->all();
    }
}
