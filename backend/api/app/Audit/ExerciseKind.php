<?php

namespace App\Audit;

enum ExerciseKind: string
{
    case Complete = 'completar';
    case Repair = 'reparar';
}
