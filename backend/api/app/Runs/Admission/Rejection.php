<?php

namespace App\Runs\Admission;

final readonly class Rejection
{
    private function __construct(
        public RejectionKind $kind,
        public ?QuotaKind $quota = null,
        public ?int $retryAfterSeconds = null,
    ) {}

    public static function unknownExercise(): self
    {
        return new self(RejectionKind::UnknownExercise);
    }

    public static function clientRunIdReused(): self
    {
        return new self(RejectionKind::ClientRunIdReused);
    }

    public static function accountDisabled(): self
    {
        return new self(RejectionKind::AccountDisabled);
    }

    public static function quota(QuotaKind $quota, int $retryAfterSeconds): self
    {
        return new self(RejectionKind::Quota, $quota, $retryAfterSeconds);
    }

    public static function queueFull(int $retryAfterSeconds): self
    {
        return new self(RejectionKind::QueueFull, retryAfterSeconds: $retryAfterSeconds);
    }
}
