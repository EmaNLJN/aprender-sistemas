<?php

namespace Tests\Support;

final class AuditExecutorDouble
{
    /**
     * @param  array<string, mixed>  $changes
     * @return array<string, mixed>
     */
    public static function result(array $changes = []): array
    {
        return [
            'phase' => 'run', 'exitCode' => 0, 'stdout' => '', 'stderr' => '', 'truncated' => false, 'timedOut' => false,
            'oomKilled' => false, 'compileMs' => 900, 'runMs' => 200, ...$changes,
        ];
    }
}
