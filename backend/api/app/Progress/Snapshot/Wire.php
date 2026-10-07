<?php

namespace App\Progress\Snapshot;

use App\Runs\Record\Instant;

final class Wire
{
    public static function instant(?string $column): ?string
    {
        return $column === null ? null : Instant::iso(Instant::parse($column));
    }

    /** @return array{value: bool|int|string, at: ?string} */
    public static function clocked(bool|int|string $value, ?string $setAt): array
    {
        return ['value' => $value, 'at' => self::instant($setAt)];
    }

    /** @return ?array{value: int|string, at: ?string} */
    public static function clockedOrNull(int|string|null $value, ?string $setAt): ?array
    {
        return $value === null ? null : ['value' => $value, 'at' => self::instant($setAt)];
    }
}
