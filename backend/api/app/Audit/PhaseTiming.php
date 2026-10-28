<?php

namespace App\Audit;

final readonly class PhaseTiming
{
    public function __construct(public int $ms, public int $limitMs) {}

    public function marginMs(): int
    {
        return $this->limitMs - $this->ms;
    }

    public function ratio(): float
    {
        return round($this->ms / $this->limitMs, 3);
    }
}
