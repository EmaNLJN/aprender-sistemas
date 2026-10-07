<?php

namespace App\Progress\Sync;

use App\Content\Record\RowFields;
use App\Runs\Record\Instant;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use LogicException;

final class OperationRegistry
{
    /**
     * @param  list<string>  $ids
     * @return array<string, RegisteredOperation>
     */
    public function lookup(int $userId, array $ids): array
    {
        if ($ids === []) {
            return [];
        }
        $rows = DB::table('sync_operations')
            ->where('user_id', $userId)
            ->whereIn('operation_id', array_map($this->toBinary(...), $ids))
            ->get(['operation_id', 'payload_sha256', 'status', 'reason']);

        $known = [];
        foreach ($rows as $row) {
            $fields = new RowFields(get_object_vars($row), 'sync_operations');
            $id = $this->toUuid($fields->string('operation_id'));
            $known[$id] = new RegisteredOperation($id, bin2hex($fields->string('payload_sha256')), $fields->string('status') === 'applied', $fields->nullableString('reason'));
        }

        return $known;
    }

    /** @param list<RegisteredOperation> $records */
    public function record(int $userId, array $records, int $clockOffsetMs, CarbonImmutable $receivedAt): void
    {
        if ($records === []) {
            return;
        }
        $received = Instant::format($receivedAt);
        $bindings = [];
        foreach ($records as $record) {
            array_push(
                $bindings,
                $userId,
                $this->toBinary($record->id),
                $this->hexToBinary($record->hash),
                $record->applied ? 'applied' : 'rejected',
                $record->reason,
                $clockOffsetMs,
                $received,
            );
        }
        $rowPlaceholders = implode(', ', array_fill(0, count($records), '(?, ?, ?, ?, ?, ?, ?)'));

        DB::insert(
            "insert into `sync_operations` (`user_id`, `operation_id`, `payload_sha256`, `status`, `reason`, `clock_offset_ms`, `received_at`) values {$rowPlaceholders}",
            $bindings,
        );
    }

    private function toBinary(string $uuid): string
    {
        return $this->hexToBinary(str_replace('-', '', $uuid));
    }

    private function hexToBinary(string $hex): string
    {
        return hex2bin($hex) ?: throw new LogicException('Un identificador de operación no es hexadecimal.');
    }

    private function toUuid(string $binary): string
    {
        return implode('-', [
            bin2hex(substr($binary, 0, 4)),
            bin2hex(substr($binary, 4, 2)),
            bin2hex(substr($binary, 6, 2)),
            bin2hex(substr($binary, 8, 2)),
            bin2hex(substr($binary, 10, 6)),
        ]);
    }
}
