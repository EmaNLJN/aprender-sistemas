<?php

namespace App\Content;

use Illuminate\Support\Facades\DB;

/**
 * Writes a ContentPlan with the query builder, never with Eloquent (ADR 0006 D09): upserts with a
 * row alias (`use_upsert_alias`), an explicit update list and server-clock times with
 * milliseconds. Never DELETE or TRUNCATE: what leaves the document is retired.
 */
final class ContentWriter
{
    /** Leaves the record of this import and returns its id. */
    public function recordImport(ContentSource $source, ContentPlan $plan): int
    {
        return (int) DB::table('content_imports')->insertGetId([
            'document_hash' => $source->documentHash(),
            'source_commit' => $source->sourceCommit(),
            'portion_hashes' => PublishedJson::encode($source->meta['portions']),
            'counts' => PublishedJson::encode($plan->report->counts),
            'changes' => PublishedJson::encode($plan->report->toArray()),
            'created_at' => $this->now(),
        ]);
    }

    public function write(ContentPlan $plan, ?int $importId): void
    {
        $now = $this->now();
        foreach (ContentTables::KEYS as $table => $keys) {
            $this->upsert($table, $keys, $plan->writes[$table] ?? [], $now);
            if ($table === 'exercises') {
                // After the exercises (foreign key) and with the id of the import that brings them.
                $this->addGradingVersions($plan->gradingVersions, $importId, $now);
            }
        }
        foreach ($plan->retires as $table => $rows) {
            $this->retire($table, $rows, $now);
        }
    }

    /**
     * @param  list<string>  $keys
     * @param  list<array<string, int|string|null>>  $rows
     */
    private function upsert(string $table, array $keys, array $rows, string $now): void
    {
        if ($rows === []) {
            return;
        }
        $hasLifecycle = ! in_array($table, ContentTables::WITHOUT_LIFECYCLE, true);
        $stamped = $hasLifecycle
            ? array_map(fn (array $row) => $row + ['status' => 'active', 'retired_at' => null, 'created_at' => $now, 'updated_at' => $now], $rows)
            : $rows;
        // Everything but the key and created_at: a row that comes back recovers status, retired_at and position.
        $update = array_values(array_diff(array_keys($stamped[0]), [...$keys, 'created_at']));
        foreach (array_chunk($stamped, 100) as $chunk) {
            DB::table($table)->upsert($chunk, $keys, $update);
        }
    }

    /** @param list<array<string, mixed>> $rows the active rows that leave the document */
    private function retire(string $table, array $rows, string $now): void
    {
        $keys = ContentTables::KEYS[$table];
        $set = ['status' => 'deprecated', 'retired_at' => $now, 'updated_at' => $now];
        if (in_array($table, ContentTables::NULL_POSITION_WHEN_RETIRED, true)) {
            $set['position'] = null;
        }
        if ($table === 'catalogs') {
            $set['chain_position'] = null;
        }
        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table($table)->where('status', 'active')->where(function ($query) use ($keys, $chunk) {
                foreach ($chunk as $row) {
                    $query->orWhere(function ($match) use ($keys, $row) {
                        foreach ($keys as $column) {
                            $match->where($column, $row[$column]);
                        }
                    });
                }
            })->update($set);
        }
    }

    /** @param list<array{exercise_id: string, grading_hash: string}> $versions */
    private function addGradingVersions(array $versions, ?int $importId, string $now): void
    {
        foreach (array_chunk($versions, 100) as $chunk) {
            // A plain INSERT, never IGNORE: a repeated version would be a bug in whoever computed the plan.
            DB::table('exercise_grading_versions')->insert(array_map(
                fn (array $version) => $version + ['first_import_id' => $importId, 'created_at' => $now],
                $chunk,
            ));
        }
    }

    private function now(): string
    {
        return now()->utc()->format('Y-m-d H:i:s.v');
    }
}
