<?php

namespace App\Progress\Operations;

final class RouteMilestones
{
    /** @var list<string> */
    public const KEYS = [
        'rust-memory', 'rust-commands', 'rust-files', 'rust-measure', 'rust-network',
        'go-memory', 'go-commands', 'go-files', 'go-measure', 'go-network',
    ];
}
