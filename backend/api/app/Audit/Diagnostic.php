<?php

namespace App\Audit;

final class Diagnostic
{
    private const MAX_LINES = 8;

    private const MAX_WIDTH = 200;

    public static function excerpt(?string $stderr, ?string $stdout): ?string
    {
        foreach ([$stderr, $stdout] as $stream) {
            $lines = [];
            foreach (explode("\n", $stream ?? '') as $line) {
                $line = rtrim($line);
                if ($line === '' || str_contains($line, '__TALLER_')) {
                    continue;
                }
                $lines[] = mb_strimwidth($line, 0, self::MAX_WIDTH, '…');
                if (count($lines) === self::MAX_LINES) {
                    break;
                }
            }
            if ($lines !== []) {
                return implode("\n", $lines);
            }
        }

        return null;
    }
}
