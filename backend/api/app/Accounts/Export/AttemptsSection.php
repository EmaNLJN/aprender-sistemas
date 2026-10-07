<?php

namespace App\Accounts\Export;

use Generator;
use Illuminate\Support\Facades\DB;

final class AttemptsSection implements ExportSection
{
    public function key(): string
    {
        return 'attempts';
    }

    /** @return Generator<int, array<string, mixed>> */
    public function read(int $userId): Generator
    {
        $chunkSize = config()->integer('taller.export.chunk');
        $lastId = 0;

        do {
            $chunk = DB::transaction(fn () => $this->chunkAfter($userId, $lastId, $chunkSize));
            foreach ($chunk as $attempt) {
                yield $attempt;
            }
            $lastId = $chunk === [] ? $lastId : $this->idOf($chunk[array_key_last($chunk)]);
        } while (count($chunk) === $chunkSize);
    }

    /** @return list<array<string, mixed>> */
    private function chunkAfter(int $userId, int $lastId, int $chunkSize): array
    {
        $rows = DB::table('attempts')->where('user_id', $userId)->where('id', '>', $lastId)->orderBy('id')->limit($chunkSize)->get();
        $ids = $rows->pluck('id')->all();
        $testsByAttempt = DB::table('attempt_tests')->whereIn('attempt_id', $ids)->orderBy('attempt_id')->orderBy('position')->get()->groupBy('attempt_id');
        $payloadsByAttempt = DB::table('attempt_payloads')->whereIn('attempt_id', $ids)->get()->keyBy('attempt_id');

        $attemptDates = RowShape::dateColumnsOf('attempts');
        $payloadDates = RowShape::dateColumnsOf('attempt_payloads');

        $attempts = [];
        foreach ($rows as $row) {
            $attempt = RowShape::of(get_object_vars($row), $attemptDates, ['user_id']);
            $attempt['tests'] = [];
            foreach ($testsByAttempt->get($row->id, []) as $test) {
                $attempt['tests'][] = RowShape::of(get_object_vars($test), [], ['attempt_id']);
            }
            $payload = $payloadsByAttempt->get($row->id);
            $attempt['payload'] = $payload === null ? null : RowShape::of(get_object_vars($payload), $payloadDates, ['attempt_id']);
            $attempts[] = $attempt;
        }

        return $attempts;
    }

    /** @param array<string, mixed> $attempt */
    private function idOf(array $attempt): int
    {
        $id = $attempt['id'] ?? null;

        return is_int($id) ? $id : 0;
    }
}
