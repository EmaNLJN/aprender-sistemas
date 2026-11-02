<?php

namespace App\Stats\Content;

use App\Stats\Period;

final class ContentStatsReader
{
    public function __construct(private CatalogStats $catalogs, private ExerciseStats $exercises) {}

    /** @return array<string, mixed> */
    public function read(ContentFilters $filters, Period $period): array
    {
        return ['catalogs' => $this->catalogs->read($filters), 'exercises' => $this->exercises->read($filters, $period)];
    }
}
