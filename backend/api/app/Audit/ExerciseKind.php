<?php

namespace App\Audit;

enum ExerciseKind: string
{
    case Completar = 'completar';
    case Reparar = 'reparar';
}
