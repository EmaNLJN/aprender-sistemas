<?php

namespace App\Progress\Import;

use App\Progress\Import\Legacy\ReportEntry;
use LogicException;

final readonly class ImportReport
{
    /** @var array<string, int> */
    public array $written;

    /**
     * @param  array<string, int>  $written
     * @param  list<ReportEntry>  $omitted
     * @param  list<ReportEntry>  $replaced
     * @param  list<ReportEntry>  $conflicts
     */
    public function __construct(array $written, public array $omitted, public array $replaced, public array $conflicts)
    {
        $counts = [];
        foreach (WrittenRows::AREAS as $area) {
            $counts[$area] = $written[$area] ?? 0;
        }
        $this->written = $counts;
    }

    /** @return array{written: array<string, int>, omitted: list<array{path: string, reason: string}>, replaced: list<array{path: string, reason: string}>, conflicts: list<array{path: string, reason: string}>} */
    public function toArray(): array
    {
        return [
            'written' => $this->written,
            'omitted' => self::entriesToArray($this->omitted),
            'replaced' => self::entriesToArray($this->replaced),
            'conflicts' => self::entriesToArray($this->conflicts),
        ];
    }

    public static function fromJson(string $json): self
    {
        $decoded = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        if (! is_array($decoded)) {
            throw new LogicException('El informe guardado no es un objeto.');
        }

        return new self(
            self::counts($decoded['written'] ?? null),
            self::entries($decoded['omitted'] ?? null),
            self::entries($decoded['replaced'] ?? null),
            self::entries($decoded['conflicts'] ?? null),
        );
    }

    /**
     * @param  list<ReportEntry>  $entries
     * @return list<array{path: string, reason: string}>
     */
    private static function entriesToArray(array $entries): array
    {
        $rows = [];
        foreach ($entries as $entry) {
            $rows[] = $entry->toArray();
        }

        return $rows;
    }

    /** @return array<string, int> */
    private static function counts(mixed $stored): array
    {
        $counts = [];
        foreach (is_array($stored) ? $stored : [] as $area => $rows) {
            if (is_int($rows)) {
                $counts[(string) $area] = $rows;
            }
        }

        return $counts;
    }

    /** @return list<ReportEntry> */
    private static function entries(mixed $stored): array
    {
        $entries = [];
        foreach (is_array($stored) ? $stored : [] as $entry) {
            if (is_array($entry) && is_string($entry['path'] ?? null) && is_string($entry['reason'] ?? null)) {
                $entries[] = new ReportEntry($entry['path'], $entry['reason']);
            }
        }

        return $entries;
    }
}
