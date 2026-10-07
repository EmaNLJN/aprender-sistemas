<?php

namespace App\Auth;

use RuntimeException;

final class BlockedPasswords
{
    /** @var array<string, array<string, true>> */
    private static array $entriesByPath = [];

    public function __construct(private string $path) {}

    public function contains(string $candidate): bool
    {
        return isset($this->entries()[mb_strtolower($candidate)]);
    }

    /** @return array<string, true> */
    private function entries(): array
    {
        return self::$entriesByPath[$this->path] ??= $this->read();
    }

    /** @return array<string, true> */
    private function read(): array
    {
        $lines = is_file($this->path) ? file($this->path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) : false;

        if ($lines === false) {
            throw new RuntimeException("The blocked passwords list is not readable at {$this->path}.");
        }

        $entries = [];
        foreach ($lines as $line) {
            $entries[mb_strtolower(trim($line))] = true;
        }

        return $entries;
    }
}
