<?php

namespace App\Progress\Import\Legacy;

final readonly class LegacyRoute
{
    /**
     * @param  list<string>  $completed
     * @param  list<string>  $milestones
     * @param  list<string>  $favorites
     * @param  array<string, int>  $quizAnswers
     * @param  array{rust: array{learned: string, next: string}, go: array{learned: string, next: string}}  $notes
     */
    public function __construct(
        public string $language,
        public int $minutes,
        public array $completed,
        public array $milestones,
        public array $favorites,
        public array $quizAnswers,
        public array $notes,
    ) {}
}
