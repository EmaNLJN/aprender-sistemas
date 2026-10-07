<?php

namespace App\Progress\Sync;

use App\Progress\ProgressAreas;
use App\Runs\Record\Instant;
use Carbon\CarbonImmutable;

final readonly class SyncOutcome
{
    /** @param list<OperationResult> $results */
    public function __construct(
        public int $epoch,
        public int $revision,
        public CarbonImmutable $serverTime,
        public string $contentVersion,
        public array $results,
        public ProgressAreas $changes,
        public bool $full,
    ) {}

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'epoch' => $this->epoch,
            'revision' => $this->revision,
            'serverTime' => Instant::iso($this->serverTime),
            'contentVersion' => $this->contentVersion,
            'results' => array_map(fn (OperationResult $result) => $result->toArray(), $this->results),
            'changes' => $this->changes->toArray($this->full),
        ];
    }
}
