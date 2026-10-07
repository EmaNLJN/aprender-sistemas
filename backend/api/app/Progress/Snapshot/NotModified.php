<?php

namespace App\Progress\Snapshot;

final readonly class NotModified
{
    public function __construct(public string $etag) {}
}
