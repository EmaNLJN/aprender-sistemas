<?php

namespace App\Audit;

use App\Runs\Program\ComposedProgram;

final readonly class AuditProgram
{
    public function __construct(
        public AuditedExercise $exercise,
        public ProgramRole $role,
        public ?CustomTestProbe $customTest,
        public ComposedProgram $composed,
        public string $fingerprint,
    ) {}
}
