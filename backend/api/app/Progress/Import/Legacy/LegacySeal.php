<?php

namespace App\Progress\Import\Legacy;

final readonly class LegacySeal
{
    public function __construct(public string $exerciseId, public bool $code, public bool $prediction, public bool $assisted) {}
}
