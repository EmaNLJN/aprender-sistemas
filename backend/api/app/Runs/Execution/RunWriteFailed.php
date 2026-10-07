<?php

namespace App\Runs\Execution;

use App\Runs\RunLog;
use Illuminate\Database\QueryException;
use RuntimeException;

final class RunWriteFailed extends RuntimeException
{
    public static function from(QueryException $error): self
    {
        return new self(sprintf('La base rechazó la escritura (SQLSTATE %s, error %s).', self::sqlState($error), self::driverCode($error) ?? 'desconocido'));
    }

    // A QueryException carries the statements with their bindings, which include the student's code.
    public static function reported(string $runId, QueryException $error): self
    {
        RunLog::writeFailed($runId, self::sqlState($error), self::driverCode($error));

        return self::from($error);
    }

    private static function sqlState(QueryException $error): string
    {
        return (string) $error->getCode();
    }

    private static function driverCode(QueryException $error): ?int
    {
        return $error->errorInfo[1] ?? null;
    }
}
