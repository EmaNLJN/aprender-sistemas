<?php

namespace Tests\Support;

use App\Audit\AuditedExercise;
use App\Audit\AuditLimits;
use App\Audit\AuditProgram;
use App\Audit\CustomTestProbe;
use App\Audit\ExerciseKind;
use App\Audit\ProgramRole;
use App\Runs\Evidence\ExecutorResult;
use App\Runs\Evidence\TestVerdict;
use App\Runs\Evidence\Verdict;
use App\Runs\ExecutorPhase;
use App\Runs\Program\ComposedProgram;
use App\Runs\Program\ExerciseSnapshot;
use App\Runs\Program\ExpectedTest;
use App\Runs\RunLanguage;
use App\Runs\RunReason;
use App\Runs\RunStatus;
use App\Runs\TestOutcome;

final class AuditCases
{
    public static function limits(): AuditLimits
    {
        return new AuditLimits(20000, 15000, 10000, 1024, 256, 0.5);
    }

    public static function exercise(string $id = 'rust-01', ExerciseKind $kind = ExerciseKind::Complete, RunLanguage $language = RunLanguage::Rust): AuditedExercise
    {
        return new AuditedExercise(
            new ExerciseSnapshot($id, $language, str_repeat('1', 64), [new ExpectedTest('t1', 'true', 1), new ExpectedTest('t2', 'true', 2)], [], '{{code}}'),
            'lab', null, $kind, str_repeat('2', 64), 'fn starter() {}', 'fn solution() {}', ['Primera', 'Segunda'],
        );
    }

    public static function program(ProgramRole $role = ProgramRole::Solution, ExerciseKind $kind = ExerciseKind::Complete, ?CustomTestProbe $probe = null): AuditProgram
    {
        return new AuditProgram(self::exercise(kind: $kind), $role, $probe, new ComposedProgram('program', ['t1', 't2'], $probe !== null, str_repeat('a', 32)), str_repeat('3', 64));
    }

    public static function result(ExecutorPhase $phase = ExecutorPhase::Run, int $compileMs = 900, int $runMs = 200, bool $oomKilled = false): ExecutorResult
    {
        return new ExecutorResult($phase, 0, '', '', false, false, $oomKilled, $compileMs, $runMs);
    }

    /** @param  list<TestOutcome>  $outcomes  for t1, t2… */
    public static function verdict(
        RunStatus $status,
        ?RunReason $reason = null,
        array $outcomes = [],
        ?TestOutcome $custom = null,
        ExecutorPhase $phase = ExecutorPhase::Run,
        int $exitCode = 0,
        string $stderr = '',
        string $stdout = '',
    ): Verdict {
        $tests = [];
        foreach ($outcomes as $index => $outcome) {
            $tests[] = new TestVerdict('t'.($index + 1), $outcome);
        }

        return new Verdict($status, $reason, $phase, $exitCode, false, 900, 200, $stdout, $stderr, $tests, $custom);
    }
}
