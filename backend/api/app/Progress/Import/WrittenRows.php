<?php

namespace App\Progress\Import;

final readonly class WrittenRows
{
    /** @var list<string> */
    public const AREAS = [
        'exercises', 'drafts', 'attempts', 'campaignSeals', 'campaignCheckpoints', 'workshops',
        'workshopObjectives', 'workshopSteps', 'routeMarks', 'routeQuiz', 'routeNotes', 'preferences',
    ];

    /** @param  array<string, int>  $counts */
    public function __construct(public array $counts) {}

    public function changed(): bool
    {
        foreach ($this->counts as $area => $rows) {
            if ($area !== 'attempts' && $rows > 0) {
                return true;
            }
        }

        return false;
    }
}
