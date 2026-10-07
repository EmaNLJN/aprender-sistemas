<?php

namespace App\Runs\Program;

use App\Runs\RunLanguage;

final readonly class ExerciseSnapshot
{
    /**
     * @param  list<ExpectedTest>  $tests  the active tests, in `position` order
     * @param  list<string>  $imports  the exercise's `imports`, as stored
     */
    public function __construct(
        public string $exerciseId,
        public RunLanguage $language,
        public string $gradingHash,
        public array $tests,
        public array $imports,
        public string $template,
    ) {}
}
