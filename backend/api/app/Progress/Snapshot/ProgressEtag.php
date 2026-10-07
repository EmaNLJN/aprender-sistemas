<?php

namespace App\Progress\Snapshot;

final class ProgressEtag
{
    private const WEAK_PREFIX = 'W/';

    public static function of(int $userId, int $epoch, int $revision, string $contentVersion): string
    {
        return self::WEAK_PREFIX."\"u{$userId}.e{$epoch}.r{$revision}.c{$contentVersion}\"";
    }

    public static function withoutWeakPrefix(string $etag): string
    {
        return str_starts_with($etag, self::WEAK_PREFIX) ? substr($etag, strlen(self::WEAK_PREFIX)) : $etag;
    }
}
