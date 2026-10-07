<?php

namespace App\Progress;

final readonly class ProgressAreas
{
    /**
     * @param  list<array<string, mixed>>  $exercises
     * @param  list<array<string, mixed>>  $drafts
     * @param  list<array<string, mixed>>  $campaignSeals
     * @param  list<array<string, mixed>>  $campaignCheckpoints
     * @param  list<array<string, mixed>>  $workshopProgress
     * @param  list<array<string, mixed>>  $workshopObjectives
     * @param  list<array<string, mixed>>  $workshopSteps
     * @param  list<array<string, mixed>>  $routeMarks
     * @param  list<array<string, mixed>>  $routeQuiz
     * @param  list<array<string, mixed>>  $routeNotes
     * @param  ?array<string, mixed>  $preferences
     */
    public function __construct(
        public array $exercises = [],
        public array $drafts = [],
        public array $campaignSeals = [],
        public array $campaignCheckpoints = [],
        public array $workshopProgress = [],
        public array $workshopObjectives = [],
        public array $workshopSteps = [],
        public array $routeMarks = [],
        public array $routeQuiz = [],
        public array $routeNotes = [],
        public ?array $preferences = null,
    ) {}

    /** @return array<string, mixed> */
    public function toArray(bool $full): array
    {
        return [
            'full' => $full,
            'exercises' => $this->exercises,
            'drafts' => $this->drafts,
            'campaign' => ['seals' => $this->campaignSeals, 'checkpoints' => $this->campaignCheckpoints],
            'workshops' => ['progress' => $this->workshopProgress, 'objectives' => $this->workshopObjectives, 'steps' => $this->workshopSteps],
            'route' => ['marks' => $this->routeMarks, 'quiz' => $this->routeQuiz, 'notes' => $this->routeNotes],
            'preferences' => $this->preferences,
        ];
    }
}
