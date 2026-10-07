<?php

namespace App\Progress\Import\Legacy;

final readonly class ContentFacts
{
    /**
     * @param  array<string, array{language: string, predictionOptions: int, activeHints: int, testKeys: list<string>}>  $exercises
     * @param  array<string, int>  $checkpointOptions
     * @param  array<string, array{predictionOptions: int, objectives: list<string>, stepsByV1Position: array<int, string>}>  $workshops
     * @param  array<string, int>  $quizOptions
     * @param  list<string>  $resources
     */
    public function __construct(
        public array $exercises,
        public array $checkpointOptions,
        public array $workshops,
        public array $quizOptions,
        public array $resources,
    ) {}
}
