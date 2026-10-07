<?php

namespace App\Progress\Import\Legacy;

final readonly class LegacyCheckpoint
{
    public function __construct(public string $worldId, public bool $passed, public ?int $lastAnswer) {}
}
