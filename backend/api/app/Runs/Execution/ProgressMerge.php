<?php

namespace App\Runs\Execution;

use App\Runs\Record\AttemptFacts;
use App\Runs\Record\RunProgress;
use App\Runs\RunStatus;
use Carbon\CarbonImmutable;

final class ProgressMerge
{
    public function afterAttempt(?RunProgress $current, AttemptFacts $attempt, int $revision): ?RunProgress
    {
        if ($attempt->outcome === RunStatus::Canceled) {
            return null;
        }
        $base = $current ?? new RunProgress($attempt->userId, $attempt->exerciseId, null, null, null, null, null, null, 0, 0);
        $passed = $attempt->outcome === RunStatus::Passed;
        $newerThanLast = $this->isNewer($attempt, $base->lastAttemptAt, $base->lastAttemptId);
        $newerThanProof = $passed && $this->isNewer($attempt, $base->proofAt, $base->proofAttemptId);
        $merged = new RunProgress(
            $base->userId,
            $base->exerciseId,
            $passed ? $this->earliest($base->solvedAt, $attempt->attemptedAt) : $base->solvedAt,
            $passed ? $this->earliest($base->serverSolvedAt, $attempt->attemptedAt) : $base->serverSolvedAt,
            $newerThanProof ? $attempt->id : $base->proofAttemptId,
            $newerThanProof ? $attempt->attemptedAt : $base->proofAt,
            $newerThanLast ? $attempt->id : $base->lastAttemptId,
            $newerThanLast ? $attempt->attemptedAt : $base->lastAttemptAt,
            $base->attemptCount + ($attempt->counted ? 1 : 0),
            $revision,
        );

        return $current !== null && $this->sameFacts($current, $merged) ? null : $merged;
    }

    private function isNewer(AttemptFacts $attempt, ?CarbonImmutable $at, ?int $id): bool
    {
        if ($at === null || $id === null) {
            return true;
        }

        return $attempt->attemptedAt->greaterThan($at) || ($attempt->attemptedAt->equalTo($at) && $attempt->id > $id);
    }

    private function earliest(?CarbonImmutable $known, CarbonImmutable $candidate): CarbonImmutable
    {
        return $known === null || $candidate->lessThan($known) ? $candidate : $known;
    }

    private function sameFacts(RunProgress $first, RunProgress $second): bool
    {
        return $this->sameInstant($first->solvedAt, $second->solvedAt)
            && $this->sameInstant($first->serverSolvedAt, $second->serverSolvedAt)
            && $first->proofAttemptId === $second->proofAttemptId
            && $this->sameInstant($first->proofAt, $second->proofAt)
            && $first->lastAttemptId === $second->lastAttemptId
            && $this->sameInstant($first->lastAttemptAt, $second->lastAttemptAt)
            && $first->attemptCount === $second->attemptCount;
    }

    private function sameInstant(?CarbonImmutable $first, ?CarbonImmutable $second): bool
    {
        return $first === null || $second === null ? $first === $second : $first->equalTo($second);
    }
}
