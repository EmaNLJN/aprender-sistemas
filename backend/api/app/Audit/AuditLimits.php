<?php

namespace App\Audit;

use App\Runs\ExecutorPhase;
use App\Runs\RunLanguage;

final readonly class AuditLimits
{
    public function __construct(
        public int $rustCompileMs,
        public int $goCompileMs,
        public int $runMs,
        public int $compileMemoryMiB,
        public int $runMemoryMiB,
        public float $warningRatio,
    ) {}

    public static function fromConfig(): self
    {
        return new self(
            config()->integer('audit.limits.compile_ms.rust'),
            config()->integer('audit.limits.compile_ms.go'),
            config()->integer('audit.limits.run_ms'),
            config()->integer('audit.limits.compile_memory_mib'),
            config()->integer('audit.limits.run_memory_mib'),
            config()->float('audit.limits.warning_ratio'),
        );
    }

    public function compileMs(RunLanguage $language): int
    {
        return $language === RunLanguage::Rust ? $this->rustCompileMs : $this->goCompileMs;
    }

    public function memoryMiB(ExecutorPhase $phase): int
    {
        return $phase === ExecutorPhase::Compile ? $this->compileMemoryMiB : $this->runMemoryMiB;
    }

    public function isNear(PhaseTiming $timing): bool
    {
        return $timing->ms > $timing->limitMs * $this->warningRatio;
    }
}
