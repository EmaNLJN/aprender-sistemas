<?php

namespace App\Accounts;

use Carbon\CarbonImmutable;

final class DeletionLedgerFile
{
    private const HEADER_PREFIX = 'user_id';

    private const ID_PATTERN = '/^[1-9][0-9]{0,17}$/';

    private const INSTANT_PATTERN = '/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?$/';

    /**
     * @return list<LedgerEntry>
     *
     * @throws MalformedLedger
     */
    public function parse(string $contents): array
    {
        $entries = [];
        $malformedLines = [];

        foreach (explode("\n", $contents) as $index => $line) {
            $line = rtrim($line, "\r");
            if ($line === '' || ($index === 0 && str_starts_with($line, self::HEADER_PREFIX))) {
                continue;
            }

            $entry = $this->entryOf($line);
            if ($entry === null) {
                $malformedLines[] = $index + 1;
            } else {
                $entries[] = $entry;
            }
        }

        if ($malformedLines !== []) {
            throw new MalformedLedger($malformedLines);
        }

        return $entries;
    }

    private function entryOf(string $line): ?LedgerEntry
    {
        $columns = explode("\t", $line);
        if (count($columns) !== 3 || preg_match(self::ID_PATTERN, $columns[0]) !== 1) {
            return null;
        }

        $userCreatedAt = $this->instantOf($columns[1]);
        $deletedAt = $this->instantOf($columns[2]);

        return $userCreatedAt === null || $deletedAt === null ? null : new LedgerEntry((int) $columns[0], $userCreatedAt, $deletedAt);
    }

    private function instantOf(string $text): ?CarbonImmutable
    {
        if (preg_match(self::INSTANT_PATTERN, $text, $parts) !== 1) {
            return null;
        }

        $microseconds = str_pad($parts[2] ?? '', 6, '0');
        $instant = CarbonImmutable::createFromFormat('!Y-m-d H:i:s.u', "{$parts[1]}.{$microseconds}", 'UTC');

        return $instant?->format('Y-m-d H:i:s') === $parts[1] ? $instant : null;
    }
}
