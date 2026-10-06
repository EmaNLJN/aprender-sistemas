<?php

namespace App\Progress\Sync;

final readonly class OperationResult
{
    public function __construct(
        public string $id,
        public ResultStatus $status,
        public ?string $reason = null,
    ) {}

    /** @return array{id: string, status: string, reason?: string} */
    public function toArray(): array
    {
        $body = ['id' => $this->id, 'status' => $this->status->value];

        return $this->reason === null ? $body : $body + ['reason' => $this->reason];
    }
}
