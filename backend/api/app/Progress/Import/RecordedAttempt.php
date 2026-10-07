<?php

namespace App\Progress\Import;

final readonly class RecordedAttempt
{
    public function __construct(
        public AttemptPointer $pointer,
        public bool $inserted,
    ) {}
}
