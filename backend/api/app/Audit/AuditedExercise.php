<?php

namespace App\Audit;

use App\Runs\Program\ExerciseSnapshot;

final readonly class AuditedExercise
{
    /** @param  list<string>  $testLabels  one per test of $snapshot->tests, in the same order */
    public function __construct(
        public ExerciseSnapshot $snapshot,
        public string $section,
        public ?string $domain,
        public ExerciseKind $kind,
        public string $starterHash,
        public string $starter,
        public string $solution,
        public array $testLabels,
    ) {}

    public function id(): string
    {
        return $this->snapshot->exerciseId;
    }

    public function code(ProgramRole $role): string
    {
        return $role === ProgramRole::Solution ? $this->solution : $this->starter;
    }

    public function labelOf(string $testKey): string
    {
        foreach ($this->snapshot->tests as $index => $test) {
            if ($test->key === $testKey) {
                return $this->testLabels[$index] ?? '';
            }
        }

        return '';
    }
}
