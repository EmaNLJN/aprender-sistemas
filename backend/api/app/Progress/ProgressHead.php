<?php

namespace App\Progress;

use App\Content\Record\RowFields;
use App\Runs\Record\Instant;
use Carbon\CarbonImmutable;

final readonly class ProgressHead
{
    public function __construct(
        public int $userId,
        public int $epoch,
        public int $revision,
        public ?CarbonImmutable $resetAt,
        public ?CarbonImmutable $lastActivityAt,
    ) {}

    /** @param array<string, mixed> $row */
    public static function fromRow(array $row): self
    {
        $fields = new RowFields($row, 'progress_heads');

        return new self(
            userId: $fields->int('user_id'),
            epoch: $fields->int('epoch'),
            revision: $fields->int('revision'),
            resetAt: Instant::parseOrNull($fields->nullableString('reset_at')),
            lastActivityAt: Instant::parseOrNull($fields->nullableString('last_activity_at')),
        );
    }
}
