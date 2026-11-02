<?php

namespace Tests\Support;

use App\Audit\AuditCatalog;
use App\Audit\AuditReport;
use App\Audit\AuditRun;
use App\Audit\AuditSelection;
use App\Audit\HostStamps;
use App\Audit\JudgedProgram;
use App\Audit\ProgramJudge;
use App\Runs\Execution\ExecutorReply;
use Carbon\CarbonImmutable;

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
    public static function exampleReport(): AuditReport
    {
        $rust01 = self::exampleExercise('rust-01', '1', '2', ['Tres celdas', 'Reactor vacío', 'Escala distinta']);
        $rust63 = self::exampleExercise('rust-63', '5', '6', ['Expresiones y coma opcional', 'Sin argumentos', 'Efecto una vez']);
        $judge = new ProgramJudge(self::limits());
        $pass = [TestOutcome::Pass, TestOutcome::Pass, TestOutcome::Pass];
        $fail = [TestOutcome::Fail, TestOutcome::Fail, TestOutcome::Fail];
        $programs = [
            $judge->judge(self::exampleProgram($rust01, ProgramRole::Solution, '3'), self::result(compileMs: 812, runMs: 34), self::verdict(RunStatus::Passed, outcomes: $pass)),
            $judge->judge(self::exampleProgram($rust01, ProgramRole::Starter, '4'), self::result(compileMs: 792, runMs: 31), self::verdict(RunStatus::Failed, outcomes: $fail)),
            $judge->judge(self::exampleProgram($rust63, ProgramRole::Solution, '7'), self::result(compileMs: 11000, runMs: 40), self::verdict(RunStatus::Passed, outcomes: $pass)),
            $judge->judge(
                self::exampleProgram($rust63, ProgramRole::Starter, '8'),
                self::result(ExecutorPhase::Compile, 640, 0),
                self::verdict(RunStatus::CompileError, phase: ExecutorPhase::Compile, exitCode: 1, stderr: "error[E0277]: can't compare `!` with `i32`\n --> /tmp/main.rs:12:57\n"),
            ),
            $judge->judge(self::exampleProgram($rust01, ProgramRole::Solution, '9', new CustomTestProbe('energia(5) == 35', TestOutcome::Pass)), self::result(compileMs: 805, runMs: 33), self::verdict(RunStatus::Passed, outcomes: $pass, custom: TestOutcome::Pass)),
            $judge->judge(self::exampleProgram($rust01, ProgramRole::Solution, 'a', new CustomTestProbe('energia(5) == 36', TestOutcome::Fail)), self::result(compileMs: 818, runMs: 36), self::verdict(RunStatus::Passed, outcomes: $pass, custom: TestOutcome::Fail)),
        ];
        $run = new AuditRun(
            CarbonImmutable::parse('2026-11-02T03:00:00.000Z'),
            CarbonImmutable::parse('2026-11-02T03:00:09.500Z'),
            'runsc',
            'auditoria',
            4,
            new AuditSelection([RunLanguage::Rust], []),
            new HostStamps(
                'dd870a9ccb7cb50b8b06b584bcf988acaccbf22e',
                true,
                'sha256:f525ccf76aec49d19b686a8d4cff8baad441ef2f30a0688c74d1a3905c17c356',
                'sha256:e66df8bf3b16022cc6426093be100ba59c09e2eaff9b88d492166e35f0a756b7',
            ),
        );
        $catalog = new AuditCatalog(
            '4555e8500e6ef5bd38cdaf46010d3f14e3345d7ec0c69aea983acfe67f62fbb6',
            '6a86d9fef4cbeebd95703a6e239f08d885071dc7a122a7ca25883d953457a6fa',
            null,
            [$rust01, $rust63],
        );

        return new AuditReport($run, $catalog, self::limits(), $programs);
    }

    /** @param  list<string>  $labels */
    private static function exampleExercise(string $id, string $gradingDigit, string $starterDigit, array $labels): AuditedExercise
    {
        $tests = [new ExpectedTest('t1', 'true', 1), new ExpectedTest('t2', 'true', 2), new ExpectedTest('t3', 'true', 3)];

        return new AuditedExercise(
            new ExerciseSnapshot($id, RunLanguage::Rust, str_repeat($gradingDigit, 64), $tests, [], '{{code}}'),
            'lab', null, ExerciseKind::Complete, str_repeat($starterDigit, 64), 'fn starter() {}', 'fn solution() {}', $labels,
        );
    }

    private static function exampleProgram(AuditedExercise $exercise, ProgramRole $role, string $fingerprintDigit, ?CustomTestProbe $probe = null): AuditProgram
    {
        return new AuditProgram($exercise, $role, $probe, new ComposedProgram('program', ['t1', 't2', 't3'], $probe !== null, str_repeat('a', 32)), str_repeat($fingerprintDigit, 64));
    }

    /** @param  list<RunLanguage>  $languages */
    public static function reportOf(array $languages, string $runtime, bool $noVerdict): AuditReport
    {
        $judge = new ProgramJudge(self::limits());
        $programs = [
            $noVerdict
                ? JudgedProgram::noVerdict(self::program(), ExecutorReply::failed('status', 500))
                : $judge->judge(self::program(), self::result(), self::verdict(RunStatus::Passed, outcomes: [TestOutcome::Pass, TestOutcome::Pass])),
            $judge->judge(self::program(ProgramRole::Starter), self::result(), self::verdict(RunStatus::Failed, outcomes: [TestOutcome::Fail, TestOutcome::Fail])),
        ];

        return self::reportWith($programs, $languages, $runtime);
    }

    /**
     * @param  list<JudgedProgram>  $programs
     * @param  list<RunLanguage>  $languages
     */
    public static function reportWith(array $programs, array $languages = [RunLanguage::Rust, RunLanguage::Go], string $runtime = 'runsc'): AuditReport
    {
        $start = CarbonImmutable::parse('2026-11-02T03:00:00.000Z');
        $run = new AuditRun($start, $start->addSeconds(61), $runtime, 'auditoria', 4, new AuditSelection($languages, []), new HostStamps(null, null, null, null));

        return new AuditReport($run, new AuditCatalog(str_repeat('d', 64), str_repeat('e', 64), null, [self::exercise()]), self::limits(), $programs);
    }
}
