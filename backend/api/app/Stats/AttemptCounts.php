<?php

namespace App\Stats;

use App\Content\Record\RowFields;

final class AttemptCounts
{
    /** @return array{attempts: array{passed: int, failed: int, compileError: int, runtimeError: int, timeout: int}, operations: array{infraError: int, canceled: int}, importedAttempts: int} */
    public static function from(RowFields $row): array
    {
        return [
            'attempts' => [
                'passed' => $row->int('passed'),
                'failed' => $row->int('failed'),
                'compileError' => $row->int('compile_error'),
                'runtimeError' => $row->int('runtime_error'),
                'timeout' => $row->int('timeout'),
            ],
            'operations' => ['infraError' => $row->int('infra_error'), 'canceled' => $row->int('canceled')],
            'importedAttempts' => $row->int('imported'),
        ];
    }

    /** @return array{attempts: array{passed: int, failed: int, compileError: int, runtimeError: int, timeout: int}, operations: array{infraError: int, canceled: int}, importedAttempts: int} */
    public static function zero(): array
    {
        $zeros = ['passed' => 0, 'failed' => 0, 'compile_error' => 0, 'runtime_error' => 0, 'timeout' => 0, 'infra_error' => 0, 'canceled' => 0, 'imported' => 0];

        return self::from(new RowFields($zeros, 'attempts'));
    }
}
