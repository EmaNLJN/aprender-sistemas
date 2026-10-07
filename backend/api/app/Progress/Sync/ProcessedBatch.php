<?php

namespace App\Progress\Sync;

final readonly class ProcessedBatch
{
    /**
     * @param  list<OperationResult>  $results
     * @param  list<RegisteredOperation>  $records
     */
    public function __construct(
        public array $results,
        public array $records,
        public bool $changed,
    ) {}
}
