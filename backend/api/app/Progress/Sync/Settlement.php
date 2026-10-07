<?php

namespace App\Progress\Sync;

use App\Progress\Operations\Checked;
use App\Progress\Operations\RejectionReason;

final readonly class Settlement
{
    private function __construct(
        public OperationResult $result,
        public RegisteredOperation $record,
        public bool $changed,
    ) {}

    public static function rejected(Checked $checked, RejectionReason $reason): self
    {
        return new self(
            new OperationResult($checked->id, ResultStatus::Rejected, $reason->value),
            new RegisteredOperation($checked->id, $checked->hash, false, $reason->value),
            false,
        );
    }

    public static function applied(Checked $checked, bool $changed): self
    {
        $status = $checked->stale ? ResultStatus::StaleContent : ResultStatus::Applied;

        return new self(
            new OperationResult($checked->id, $status),
            new RegisteredOperation($checked->id, $checked->hash, true, $checked->stale ? ResultStatus::StaleContent->value : null),
            $changed,
        );
    }
}
