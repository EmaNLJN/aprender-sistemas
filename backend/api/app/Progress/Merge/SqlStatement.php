<?php

namespace App\Progress\Merge;

final readonly class SqlStatement
{
    /** @param list<string|int|null> $bindings */
    public function __construct(
        public string $sql,
        public array $bindings,
    ) {}
}
