<?php

namespace App\Progress\Reset;

final readonly class ResetOutcome
{
    /** @param array<string, int> $deleted rows deleted from each table, for the log */
    public function __construct(public int $epoch, public int $revision, public array $deleted) {}

    /** @return array{epoch: int, revision: int} */
    public function toArray(): array
    {
        return ['epoch' => $this->epoch, 'revision' => $this->revision];
    }
}
