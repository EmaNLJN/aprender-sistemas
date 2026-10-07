<?php

namespace App\Accounts\Export;

use App\Content\ContentSnapshot;
use App\Progress\Snapshot\ProgressSnapshotReader;

final class ProgressSection implements ExportSection
{
    public function __construct(private readonly ProgressSnapshotReader $reader) {}

    public function key(): string
    {
        return 'progress';
    }

    /** @return array<string, mixed> */
    public function read(int $userId): array
    {
        $areas = ContentSnapshot::read(fn () => $this->reader->areas($userId, null));
        $snapshot = $areas->toArray(true);
        unset($snapshot['full']);

        return $snapshot;
    }
}
