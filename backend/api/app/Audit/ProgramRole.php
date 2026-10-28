<?php

namespace App\Audit;

enum ProgramRole: string
{
    case Solution = 'solution';
    case Starter = 'starter';

    public function label(): string
    {
        return match ($this) {
            self::Solution => 'solución',
            self::Starter => 'inicial',
        };
    }
}
