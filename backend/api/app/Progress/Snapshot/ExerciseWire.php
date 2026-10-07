<?php

namespace App\Progress\Snapshot;

use App\Content\Record\RowFields;

final class ExerciseWire
{
    /**
     * @param  array<string, mixed>  $row  `exercise_progress` joined with the two attempts and the current grading hash of the exercise
     * @param  array<int, list<array{testKey: string, outcome: string}>>  $verdictsByAttempt
     * @return array<string, mixed>
     */
    public static function of(array $row, array $verdictsByAttempt): array
    {
        $fields = new RowFields($row, 'exercise_progress');
        $confidence = $fields->nullableString('confidence');
        $reviewedAt = $fields->nullableString('reviewed_at');
        $reviewDueAt = $fields->nullableString('review_due_at');
        $predictionAnswer = $fields->nullableInt('prediction_answer');
        $reflection = $fields->nullableString('reflection');
        $customTest = $fields->nullableString('custom_test');
        $proofId = $fields->nullableInt('proof_attempt_id');
        $lastId = $fields->nullableInt('last_attempt_id');
        $proofOutcome = $fields->nullableString('proof_outcome');
        $lastOutcome = $fields->nullableString('last_outcome');

        return [
            'exerciseId' => $fields->string('exercise_id'),
            'revision' => $fields->int('revision'),
            'prediction' => $predictionAnswer === null ? null : ['answer' => $predictionAnswer, 'at' => Wire::instant($fields->nullableString('prediction_answer_set_at'))],
            'predictionCorrect' => Wire::clocked($fields->flag('prediction_correct'), $fields->nullableString('prediction_correct_at')),
            'assisted' => $fields->flag('assisted'),
            'solutionSeen' => $fields->flag('solution_seen'),
            'hintsRevealed' => $fields->nullableInt('hints_revealed'),
            'reflection' => $reflection === null ? null : ['text' => $reflection, 'at' => Wire::instant($fields->nullableString('reflection_set_at'))],
            'customTest' => $customTest === null ? null : ['text' => $customTest, 'at' => Wire::instant($fields->nullableString('custom_test_set_at'))],
            'review' => $confidence === null && $reviewedAt === null && $reviewDueAt === null ? null : [
                'confidence' => $confidence,
                'reviewedAt' => Wire::instant($reviewedAt),
                'reviewDueAt' => Wire::instant($reviewDueAt),
                'at' => Wire::instant($fields->nullableString('review_set_at')),
            ],
            'solvedAt' => Wire::instant($fields->nullableString('solved_at')),
            'serverSolvedAt' => Wire::instant($fields->nullableString('server_solved_at')),
            'proof' => $proofId === null || $proofOutcome === null ? null : [
                'attemptId' => $proofId,
                'at' => Wire::instant($fields->nullableString('proof_at')),
                'state' => ProofState::of($fields->flag('proof_legacy'), $fields->nullableString('proof_grading_hash'), $fields->string('current_grading_hash'))->value,
                'tests' => $verdictsByAttempt[$proofId] ?? [],
            ],
            'lastAttempt' => $lastId === null || $lastOutcome === null ? null : [
                'attemptId' => $lastId,
                'at' => Wire::instant($fields->nullableString('last_attempt_at')),
                'outcome' => $lastOutcome,
                'legacy' => $fields->flag('last_legacy'),
                'tests' => $verdictsByAttempt[$lastId] ?? [],
            ],
            'attemptCount' => $fields->int('attempt_count'),
            'legacyAttempts' => $fields->nullableInt('legacy_attempts'),
        ];
    }
}
