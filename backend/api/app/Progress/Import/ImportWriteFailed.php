<?php

namespace App\Progress\Import;

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Log;
use RuntimeException;

final class ImportWriteFailed extends RuntimeException
{
    // A QueryException carries the statements with their bindings, which include the raw and the student's text.
    public static function from(QueryException $error): self
    {
        $sqlState = (string) $error->getCode();
        $driverCode = $error->errorInfo[1] ?? null;
        Log::error('import.write_failed', ['sql_state' => $sqlState, 'driver_code' => $driverCode]);

        return new self(sprintf('La base rechazó la escritura (SQLSTATE %s, error %s).', $sqlState, $driverCode ?? 'desconocido'));
    }
}
