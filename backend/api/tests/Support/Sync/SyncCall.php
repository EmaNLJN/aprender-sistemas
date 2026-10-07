<?php

namespace Tests\Support\Sync;

use App\Progress\Sync\OperationResult;
use App\Progress\Sync\SyncRequest;
use App\Progress\Sync\SyncService;
use App\Runs\Record\Instant;
use Tests\Support\MergeFixture;

final class SyncCall
{
    /**
     * @param  list<array<string, mixed>>  $operations
     * @return array{statuses: list<string>, revision: int}
     */
    public static function run(int $userId, array $operations, int $knownRevision = 0, float $startAt = 0.0): array
    {
        self::waitUntil($startAt);
        $request = new SyncRequest(1, Instant::now(), $knownRevision, MergeFixture::world()['contentVersion'], 2, $operations);
        $outcome = app(SyncService::class)->sync($userId, $request);

        return [
            'statuses' => array_map(fn (OperationResult $result) => $result->status->value, $outcome->results),
            'revision' => $outcome->revision,
        ];
    }

    public static function waitUntil(float $startAt): void
    {
        while (microtime(true) < $startAt) {
            usleep(1000);
        }
    }

    public static function startIn(float $seconds): float
    {
        return microtime(true) + $seconds;
    }
}
