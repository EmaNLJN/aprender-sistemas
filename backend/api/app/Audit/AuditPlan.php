<?php

namespace App\Audit;

use App\Runs\Program\ProgramComposer;
use App\Runs\TestOutcome;

final class AuditPlan
{
    public const ZERO_NONCE = '00000000000000000000000000000000';

    public function __construct(private ProgramComposer $composer) {}

    /** @return list<AuditProgram> */
    public function programs(AuditCatalog $catalog, AuditSelection $selection): array
    {
        $programs = [];
        foreach ($catalog->exercises as $exercise) {
            if ($selection->includes($exercise)) {
                $programs[] = $this->program($exercise, ProgramRole::Solution, null);
                $programs[] = $this->program($exercise, ProgramRole::Starter, null);
            }
        }
        if ($selection->exercises !== []) {
            return $programs;
        }
        foreach ($selection->languages as $language) {
            $sample = "audit.custom_test_sample.{$language->value}";
            $id = config()->string("{$sample}.exercise");
            $exercise = $catalog->find($id);
            if ($exercise === null || $exercise->snapshot->language !== $language) {
                throw AuditRefused::sampleMissing($id);
            }
            $programs[] = $this->program($exercise, ProgramRole::Solution, new CustomTestProbe(config()->string("{$sample}.passing"), TestOutcome::Pass));
            $programs[] = $this->program($exercise, ProgramRole::Solution, new CustomTestProbe(config()->string("{$sample}.failing"), TestOutcome::Fail));
        }

        return $programs;
    }

    private function program(AuditedExercise $exercise, ProgramRole $role, ?CustomTestProbe $customTest): AuditProgram
    {
        $code = $exercise->code($role);
        $expression = $customTest?->expression;

        return new AuditProgram(
            $exercise,
            $role,
            $customTest,
            $this->composer->compose($exercise->snapshot, $code, $expression, bin2hex(random_bytes(16))),
            hash('sha256', $this->composer->compose($exercise->snapshot, $code, $expression, self::ZERO_NONCE)->text),
        );
    }
}
