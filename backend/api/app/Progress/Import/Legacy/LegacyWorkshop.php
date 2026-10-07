<?php

namespace App\Progress\Import\Legacy;

final readonly class LegacyWorkshop
{
    /**
     * @param  list<string>  $observed
     * @param  list<string>  $steps
     */
    public function __construct(
        public string $workshopId,
        public string $language,
        public bool $codeSealed,
        public bool $predicted,
        public ?int $answer,
        public array $observed,
        public array $steps,
        public string $note,
    ) {}
}
