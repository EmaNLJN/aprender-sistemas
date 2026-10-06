<?php

namespace App\Runs\Execution;

use App\Runs\Record\RunRow;
use Illuminate\Support\Facades\DB;

final class RunStore
{
    public function ownerOf(string $runId): ?int
    {
        $owner = DB::scalar('select `user_id` from `runs` where `id` = ?', [$runId]);

        return is_numeric($owner) ? (int) $owner : null;
    }

    public function locked(string $runId): ?RunRow
    {
        $rows = DB::select('select * from `runs` where `id` = ? for update', [$runId]);

        return $rows === [] ? null : RunRow::fromRow(get_object_vars($rows[0]));
    }
}
