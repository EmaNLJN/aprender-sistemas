<?php

namespace App\Progress\Import;

use Illuminate\Support\Facades\Log;

final class ImportLog
{
    public static function applied(int $userId, ImportRequest $request, ImportOutcome $outcome, float $startedAt): void
    {
        self::record('progress.import.applied', $userId, $request, $outcome, $startedAt);
    }

    public static function repeated(int $userId, ImportRequest $request, ImportOutcome $outcome, float $startedAt): void
    {
        self::record('progress.import.repeated', $userId, $request, $outcome, $startedAt);
    }

    // The context carries counts and identifiers only: never the raw, a text or a value of the student (FR-057).
    private static function record(string $event, int $userId, ImportRequest $request, ImportOutcome $outcome, float $startedAt): void
    {
        $report = $outcome->import->report;
        Log::info($event, [
            'user_id' => $userId,
            'import_id' => $request->importId,
            'source' => $request->source->value,
            'epoch' => $outcome->import->epoch,
            'revision' => $outcome->import->revision,
            'written' => $report->written,
            'omitted' => count($report->omitted),
            'conflicts' => count($report->conflicts),
            'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
            'peak_memory_bytes' => memory_get_peak_usage(true),
        ]);
    }
}
