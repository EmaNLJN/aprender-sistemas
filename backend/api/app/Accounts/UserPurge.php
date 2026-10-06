<?php

namespace App\Accounts;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class UserPurge
{
    public function __construct(private UserData $data) {}

    public function inBatches(int $userId): int
    {
        $batchSize = config()->integer('taller.purge.batch_size');
        $deleted = 0;

        foreach ($this->data->batchTables() as $table) {
            if (Schema::hasTable($table->name)) {
                $deleted += $this->deleteInBatches($table, $userId, $batchSize);
            }
        }

        return $deleted;
    }

    private function deleteInBatches(UserTable $table, int $userId, int $batchSize): int
    {
        $sql = "delete from `{$table->name}` where `user_id` = ? order by `{$table->batchesBy}` limit {$batchSize}";
        $total = 0;

        do {
            $affected = DB::delete($sql, [$userId]);
            $total += $affected;
        } while ($affected >= $batchSize);

        return $total;
    }
}
