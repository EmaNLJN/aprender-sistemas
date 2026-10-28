<?php

namespace App\Audit;

use App\Runs\Program\ExerciseSnapshot;
use InvalidArgumentException;

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
    ) {
        if (count($testLabels) !== count($snapshot->tests)) {
            throw new InvalidArgumentException(sprintf(
                '%s tiene %d pruebas y %d etiquetas.',
                $snapshot->exerciseId,
                count($snapshot->tests),
                count($testLabels),
            ));
        }
    }

    public function id(): string
    {
        return $this->snapshot->exerciseId;
    }

    public function code(ProgramRole $role): string
    {
        return match ($role) {
            ProgramRole::Solution => $this->solution,
            ProgramRole::Starter => $this->starter,
        };
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
