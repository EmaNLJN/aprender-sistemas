<?php

namespace App\Accounts\Export;

use Illuminate\Support\Facades\DB;

final class ExerciseProgressSection implements ExportSection
{
    public function key(): string
    {
        return 'exerciseProgress';
    }

    /** @return list<array<string, mixed>> */
    public function read(int $userId): array
    {
        $dateColumns = RowShape::dateColumnsOf('exercise_progress');
        $rows = DB::transaction(fn () => DB::table('exercise_progress')->where('user_id', $userId)->orderBy('exercise_id')->get());

        $progress = [];
        foreach ($rows as $row) {
            $progress[] = RowShape::of(get_object_vars($row), $dateColumns, ['user_id']);
        }

        return $progress;
    }
}
