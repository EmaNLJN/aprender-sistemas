<?php

namespace App\Content;

use Illuminate\Support\Facades\DB;

/** What the content tables hold today, active or retired, to compute the difference. */
final class ContentStore
{
    /** @return array<string, array<string, array<string, mixed>>> rows by table and primary key */
    public function rows(): array
    {
        $tables = [];
        foreach (array_keys(ContentTables::KEYS) as $table) {
            $tables[$table] = [];
            foreach (DB::table($table)->get() as $row) {
                $row = (array) $row;
                $tables[$table][ContentTables::keyOf($table, $row)] = $row;
            }
        }

        return $tables;
    }

    /** @return array<string, true> "exercise\x1fhash" of every grading version that already applied */
    public function gradingVersions(): array
    {
        $known = [];
        foreach (DB::table('exercise_grading_versions')->get(['exercise_id', 'grading_hash']) as $row) {
            $known["{$row->exercise_id}\x1f{$row->grading_hash}"] = true;
        }

        return $known;
    }
}
