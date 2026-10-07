<?php

namespace App\Progress\Merge;

use App\Progress\Operations\FieldKind;
use Carbon\CarbonImmutable;

final readonly class FieldWrite
{
    /** @param list<string|int|null> $values bound in the order of $kind->columns */
    public function __construct(
        public FieldKind $kind,
        public array $values,
        public ?CarbonImmutable $at,
    ) {}
}
