<?php

namespace App\Audit;

use Carbon\CarbonImmutable;
use Closure;

final class AuditReport
{
    public const FORMAT = 'taller-curriculum-audit-1';

    /** @param  list<JudgedProgram>  $programs */
    public function __construct(
        private AuditRun $run,
        private AuditCatalog $catalog,
        private AuditLimits $limits,
        private array $programs,
    ) {}

    public function run(): AuditRun
    {
        return $this->run;
    }

    /** @return list<JudgedProgram> */
    public function programs(): array
    {
        return $this->programs;
    }

    public function isGreen(): bool
    {
        $counts = $this->counts();

        return $counts['findings'] === 0 && $counts['noVerdict'] === 0;
    }

    public function isRecord(): bool
    {
        return $this->run->selection->isFull() && $this->run->runtime === 'runsc' && $this->counts()['noVerdict'] === 0;
    }

    public function exitCode(): int
    {
        return $this->isGreen() ? 0 : 1;
    }

    public function durationMs(): int
    {
        return (int) $this->run->startedAt->diffInMilliseconds($this->run->finishedAt);
    }

    /** @return array{programs: int, solutions: int, solutionsPass: int, starters: int, startersFailAsExpected: int, customTestSample: int, customTestSamplePass: int, findings: int, noVerdict: int, warnings: int} */
    public function counts(): array
    {
        $plain = fn (ProgramRole $role): Closure => fn (JudgedProgram $judged): bool => $judged->program->role === $role && $judged->program->customTest === null;
        $sample = fn (JudgedProgram $judged): bool => $judged->program->customTest !== null;
        $is = fn (AuditVerdict $verdict): Closure => fn (JudgedProgram $judged): bool => $judged->audit === $verdict;

        return [
            'programs' => count($this->programs),
            'solutions' => $this->countWhere($plain(ProgramRole::Solution)),
            'solutionsPass' => $this->countWhere(fn (JudgedProgram $judged): bool => $plain(ProgramRole::Solution)($judged) && $is(AuditVerdict::Passes)($judged)),
            'starters' => $this->countWhere($plain(ProgramRole::Starter)),
            'startersFailAsExpected' => $this->countWhere(fn (JudgedProgram $judged): bool => $plain(ProgramRole::Starter)($judged) && $is(AuditVerdict::FailsAsExpected)($judged)),
            'customTestSample' => $this->countWhere($sample),
            'customTestSamplePass' => $this->countWhere(fn (JudgedProgram $judged): bool => $sample($judged) && $is(AuditVerdict::Passes)($judged)),
            'findings' => $this->countWhere($is(AuditVerdict::Finding)),
            'noVerdict' => $this->countWhere($is(AuditVerdict::NoVerdict)),
            'warnings' => $this->countWhere(fn (JudgedProgram $judged): bool => $judged->warning),
        ];
    }

    /** @return array<string, array{exercises: int, programs: int}> */
    public function byLanguage(): array
    {
        $languages = [];
        foreach ($this->run->selection->languages as $language) {
            $languages[$language->value] = [
                'exercises' => collect($this->audited())->filter(fn (AuditedExercise $exercise): bool => $exercise->snapshot->language === $language)->count(),
                'programs' => $this->countWhere(fn (JudgedProgram $judged): bool => $judged->program->exercise->snapshot->language === $language),
            ];
        }

        return $languages;
    }

    /** @return array<string, array{exercises: int}> */
    public function bySection(): array
    {
        $sections = [];
        foreach ($this->audited() as $exercise) {
            $sections[$exercise->section] = ['exercises' => ($sections[$exercise->section]['exercises'] ?? 0) + 1];
        }

        return $sections;
    }

    /** @return array<string, array{compile: array{programs: int, medianMs: int, maxMs: int, minMarginMs: int, limitMs: int}|null, run: array{programs: int, medianMs: int, maxMs: int, minMarginMs: int, limitMs: int}|null}> */
    public function timing(): array
    {
        $timing = [];
        foreach ($this->run->selection->languages as $language) {
            $compile = [];
            $run = [];
            foreach ($this->programs as $judged) {
                if ($judged->program->exercise->snapshot->language === $language) {
                    $compile[] = $judged->compile?->ms;
                    $run[] = $judged->run?->ms;
                }
            }
            $timing[$language->value] = [
                'compile' => self::stats($compile, $this->limits->compileMs($language)),
                'run' => self::stats($run, $this->limits->runMs),
            ];
        }

        return $timing;
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'format' => self::FORMAT,
            'run' => $this->runPart(),
            'stamps' => [
                'commit' => $this->run->host->commit,
                'cleanTree' => $this->run->host->cleanTree,
                'contentSourceCommit' => $this->catalog->sourceCommit,
                'documentHash' => $this->catalog->documentHash,
                'harnessHash' => $this->catalog->harnessHash,
                'images' => ['rust' => $this->run->host->rustImage, 'go' => $this->run->host->goImage],
            ],
            'limits' => [
                'compileMs' => ['rust' => $this->limits->rustCompileMs, 'go' => $this->limits->goCompileMs],
                'runMs' => $this->limits->runMs,
                'compileMemoryMiB' => $this->limits->compileMemoryMiB,
                'runMemoryMiB' => $this->limits->runMemoryMiB,
                'warningRatio' => $this->limits->warningRatio,
            ],
            'totals' => [...$this->counts(), 'byLanguage' => $this->byLanguage(), 'bySection' => $this->bySection(), 'timing' => $this->timing()],
            'programs' => collect($this->programs)->map($this->programPart(...))->all(),
        ];
    }

    public function json(): string
    {
        return json_encode($this->toArray(), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)."\n";
    }

    /** @return array<string, mixed> */
    private function runPart(): array
    {
        $languages = [];
        foreach ($this->run->selection->languages as $language) {
            $languages[] = $language->value;
        }

        return [
            'startedAt' => self::instant($this->run->startedAt),
            'finishedAt' => self::instant($this->run->finishedAt),
            'durationMs' => $this->durationMs(),
            'runtime' => $this->run->runtime,
            'instance' => $this->run->instance,
            'concurrency' => $this->run->concurrency,
            'scope' => $this->run->selection->isFull() ? 'full' : 'partial',
            'selection' => ['languages' => $languages, 'exercises' => $this->run->selection->exercises],
            'record' => $this->isRecord(),
            'verdict' => $this->isGreen() ? 'green' : 'red',
            'exitCode' => $this->exitCode(),
        ];
    }

    /** @return array<string, mixed> */
    private function programPart(JudgedProgram $judged): array
    {
        $program = $judged->program;
        $exercise = $program->exercise;
        $tests = [];
        foreach ($judged->tests as $test) {
            $tests[] = ['key' => $test->key, 'label' => $exercise->labelOf($test->key), 'outcome' => $test->outcome->value];
        }

        return [
            'exercise' => $exercise->id(),
            'language' => $exercise->snapshot->language->value,
            'section' => $exercise->section,
            'domain' => $exercise->domain,
            'kind' => $exercise->kind->value,
            'role' => $program->role->value,
            'gradingHash' => $exercise->snapshot->gradingHash,
            'starterHash' => $exercise->starterHash,
            'programHash' => $program->fingerprint,
            'customTest' => $program->customTest === null ? null : [
                'expression' => $program->customTest->expression,
                'expected' => $program->customTest->expected->value,
                'outcome' => $judged->custom?->value,
            ],
            'status' => $judged->status?->value,
            'reason' => $judged->reason?->value,
            'phase' => $judged->phase?->value,
            'exitCode' => $judged->exitCode,
            'tests' => $tests,
            'compile' => self::timingPart($judged->compile),
            'run' => self::timingPart($judged->run),
            'truncated' => $judged->truncated,
            'oomKilled' => $judged->oomKilled,
            'memoryLimitMiB' => $judged->phase === null ? null : $this->limits->memoryMiB($judged->phase),
            'audit' => $judged->audit->value,
            'finding' => $judged->finding?->value,
            'warning' => $judged->warning,
            'noVerdictCause' => $judged->noVerdictCause,
            'diagnostic' => $judged->diagnostic,
        ];
    }

    /** @return list<AuditedExercise> */
    private function audited(): array
    {
        $audited = [];
        foreach ($this->catalog->exercises as $exercise) {
            if ($this->run->selection->includes($exercise)) {
                $audited[] = $exercise;
            }
        }

        return $audited;
    }

    /** @param  Closure(JudgedProgram): bool  $matches */
    private function countWhere(Closure $matches): int
    {
        return collect($this->programs)->filter($matches)->count();
    }

    /**
     * @param  list<int|null>  $values
     * @return array{programs: int, medianMs: int, maxMs: int, minMarginMs: int, limitMs: int}|null
     */
    private static function stats(array $values, int $limitMs): ?array
    {
        $measured = [];
        foreach ($values as $value) {
            if ($value !== null) {
                $measured[] = $value;
            }
        }
        if ($measured === []) {
            return null;
        }
        sort($measured);
        $count = count($measured);
        $middle = intdiv($count, 2);
        $median = $count % 2 === 1 ? $measured[$middle] : intdiv($measured[$middle - 1] + $measured[$middle], 2);
        $max = $measured[$count - 1];

        return ['programs' => $count, 'medianMs' => $median, 'maxMs' => $max, 'minMarginMs' => $limitMs - $max, 'limitMs' => $limitMs];
    }

    /** @return array{ms: int, limitMs: int, marginMs: int, ratio: float}|null */
    private static function timingPart(?PhaseTiming $timing): ?array
    {
        return $timing === null ? null : ['ms' => $timing->ms, 'limitMs' => $timing->limitMs, 'marginMs' => $timing->marginMs(), 'ratio' => $timing->ratio()];
    }

    private static function instant(CarbonImmutable $at): string
    {
        return $at->utc()->format('Y-m-d\TH:i:s.v\Z');
    }
}
