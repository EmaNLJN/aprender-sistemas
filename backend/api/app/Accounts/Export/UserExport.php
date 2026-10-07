<?php

namespace App\Accounts\Export;

use App\Runs\Record\Instant;

final class UserExport
{
    private const FORMAT = 'taller-export-2';

    public function __construct(
        private readonly AccountSection $account,
        private readonly ProgressSection $progress,
        private readonly AttemptsSection $attempts,
    ) {}

    /** @return array<string, mixed> */
    public function document(int $userId): array
    {
        $document = ['format' => self::FORMAT, 'exportedAt' => Instant::iso(Instant::now())];
        foreach ($this->sections() as $section) {
            $document[$section->key()] = $section->read($userId);
        }

        return $document;
    }

    /** @return list<string> */
    public function sectionKeys(): array
    {
        $keys = [];
        foreach ($this->sections() as $section) {
            $keys[] = $section->key();
        }

        return $keys;
    }

    /** @return list<ExportSection> */
    private function sections(): array
    {
        return [$this->account, $this->progress, $this->attempts];
    }
}
