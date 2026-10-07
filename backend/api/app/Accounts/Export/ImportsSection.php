<?php

namespace App\Accounts\Export;

use Generator;
use Illuminate\Support\Facades\DB;

final class ImportsSection implements ExportSection
{
    public function key(): string
    {
        return 'imports';
    }

    /** @return Generator<int, array<string, mixed>> */
    public function read(int $userId): Generator
    {
        $lastId = 0;

        do {
            $row = DB::transaction(fn () => DB::table('progress_imports')->where('user_id', $userId)->where('id', '>', $lastId)->orderBy('id')->first());
            if ($row !== null) {
                $lastId = (int) $row->id;
                yield $this->shaped(get_object_vars($row));
            }
        } while ($row !== null);
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function shaped(array $row): array
    {
        $shaped = RowShape::of($row, RowShape::dateColumnsOf('progress_imports'), ['id', 'user_id']);
        $report = $shaped['report'] ?? null;
        $shaped['report'] = is_string($report) ? json_decode($report, false, 512, JSON_THROW_ON_ERROR) : $report;

        return $shaped;
    }
}
