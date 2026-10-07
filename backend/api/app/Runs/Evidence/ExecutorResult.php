<?php

namespace App\Runs\Evidence;

use App\Runs\ExecutorPhase;

final readonly class ExecutorResult
{
    private const KEYS = ['phase', 'exitCode', 'stdout', 'stderr', 'truncated', 'timedOut', 'oomKilled', 'compileMs', 'runMs'];

    private const MAX_UNSIGNED_INT = 4294967295;

    public function __construct(
        public ExecutorPhase $phase,
        public int $exitCode,
        public string $stdout,
        public string $stderr,
        public bool $truncated,
        public bool $timedOut,
        public bool $oomKilled,
        public int $compileMs,
        public int $runMs,
    ) {}

    public static function fromPayload(mixed $payload): ?self
    {
        if (! is_array($payload) || count($payload) !== count(self::KEYS) || array_diff(self::KEYS, array_keys($payload)) !== []) {
            return null;
        }
        $phase = is_string($payload['phase']) ? ExecutorPhase::tryFrom($payload['phase']) : null;
        $exitCode = $payload['exitCode'];
        $stdout = $payload['stdout'];
        $stderr = $payload['stderr'];
        $truncated = $payload['truncated'];
        $timedOut = $payload['timedOut'];
        $oomKilled = $payload['oomKilled'];
        $compileMs = $payload['compileMs'];
        $runMs = $payload['runMs'];

        $valid = $phase !== null
            && is_int($exitCode) && is_string($stdout) && is_string($stderr)
            && is_bool($truncated) && is_bool($timedOut) && is_bool($oomKilled)
            && is_int($compileMs) && is_int($runMs)
            && $exitCode >= -32768 && $exitCode <= 32767
            && self::isUnsignedInt($compileMs) && self::isUnsignedInt($runMs)
            && ! ($phase === ExecutorPhase::Compile && $exitCode === 0 && ! $timedOut && ! $oomKilled);

        return $valid ? new self($phase, $exitCode, $stdout, $stderr, $truncated, $timedOut, $oomKilled, $compileMs, $runMs) : null;
    }

    private static function isUnsignedInt(int $value): bool
    {
        return $value >= 0 && $value <= self::MAX_UNSIGNED_INT;
    }
}
