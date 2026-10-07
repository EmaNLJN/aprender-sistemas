<?php

namespace App\Progress\Import;

use RuntimeException;

final class ImportNeedsConfirmation extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('La importación necesita la confirmación del alumno.');
    }
}
