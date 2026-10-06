<?php

namespace App\Runs\Admission;

use App\Runs\Record\RunRow;

final readonly class AdmissionResult
{
    public function __construct(public RunRow $run, public bool $created) {}
}
