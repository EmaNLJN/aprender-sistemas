<?php

namespace App\Runs\Admission;

enum RejectionKind
{
    case UnknownExercise;
    case ClientRunIdReused;
    case AccountDisabled;
    case Quota;
    case QueueFull;
}
