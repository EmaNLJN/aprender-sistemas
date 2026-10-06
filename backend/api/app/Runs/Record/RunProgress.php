<?php

namespace App\Runs\Record;

use App\Content\Record\RowFields;
use Carbon\CarbonImmutable;

final readonly class RunProgress
{
    public function __construct(
        public int $userId,
        public string $exerciseId,
        public ?CarbonImmutable $solvedAt,
        public ?CarbonImmutable $serverSolvedAt,
        public ?int $proofAttemptId,
        public ?CarbonImmutable $proofAt,
        public ?int $lastAttemptId,
        public ?CarbonImmutable $lastAttemptAt,
        public int $attemptCount,
        public int $revision,
    ) {}

    /** @param array<string, mixed> $row */
    public static function fromRow(array $row): self
    {
        $fields = new RowFields($row, 'exercise_progress');

        return new self(
            userId: $fields->int('user_id'),
            exerciseId: $fields->string('exercise_id'),
            solvedAt: Instant::parseOrNull($fields->nullableString('solved_at')),
            serverSolvedAt: Instant::parseOrNull($fields->nullableString('server_solved_at')),
            proofAttemptId: $fields->nullableInt('proof_attempt_id'),
            proofAt: Instant::parseOrNull($fields->nullableString('proof_at')),
            lastAttemptId: $fields->nullableInt('last_attempt_id'),
            lastAttemptAt: Instant::parseOrNull($fields->nullableString('last_attempt_at')),
            attemptCount: $fields->int('attempt_count'),
            revision: $fields->int('revision'),
        );
    }
}
