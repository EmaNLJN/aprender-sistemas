<?php

namespace App\Progress\Sync;

enum ResultStatus: string
{
    case Applied = 'applied';
    case Rejected = 'rejected';
    case Duplicate = 'duplicate';
    case UuidReused = 'uuid_reused';
    case StaleContent = 'stale_content';
}
