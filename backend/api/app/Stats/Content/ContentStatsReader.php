<?php

namespace App\Stats\Content;

use App\Stats\Period;

final class ContentStatsReader
{
    public function __construct(private CatalogStats $catalogs,
        private ExerciseStats $exercises,
        private CampaignStats $campaign,
        private WorkshopStats $workshops,
        private RouteStats $route,
    ) {}

    /** @return array<string, mixed> */
    public function read(ContentFilters $filters, Period $period): array
    {
        return [
            'catalogs' => $this->catalogs->read($filters),
            'exercises' => $this->exercises->read($filters, $period),
            'worlds' => $this->campaign->read($filters),
            'workshops' => $this->workshops->read($filters),
            'route' => $this->route->read(),
        ];
    }
}
