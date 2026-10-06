<?php

namespace App\Runs\Execution;

use App\Runs\Evidence\ExecutorResult;

final readonly class ExecutorReply
{
    private function __construct(
        public ReplyKind $kind,
        public ?ExecutorResult $result,
        public int $retryAfterSeconds,
        public string $cause,
        public ?int $httpStatus,
    ) {}

    public static function result(ExecutorResult $result): self
    {
        return new self(ReplyKind::Result, $result, 0, '', null);
    }

    public static function busy(int $retryAfterSeconds): self
    {
        return new self(ReplyKind::Busy, null, $retryAfterSeconds, '', null);
    }

    public static function notReached(): self
    {
        return new self(ReplyKind::NotReached, null, 0, '', null);
    }

    public static function failed(string $cause, ?int $httpStatus): self
    {
        return new self(ReplyKind::Failed, null, 0, $cause, $httpStatus);
    }
}
