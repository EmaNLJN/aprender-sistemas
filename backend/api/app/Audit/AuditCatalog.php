<?php

namespace App\Audit;

final readonly class AuditCatalog
{
    /** @param  list<AuditedExercise>  $exercises */
    public function __construct(
        public string $documentHash,
        public string $harnessHash,
        public ?string $sourceCommit,
        public array $exercises,
    ) {}

    public function find(string $id): ?AuditedExercise
    {
        foreach ($this->exercises as $exercise) {
            if ($exercise->id() === $id) {
                return $exercise;
            }
        }

        return null;
    }
}
