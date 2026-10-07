<?php

namespace Tests\Support\Sync;

final class ServerCases
{
    /** @var ?list<array<string, mixed>> */
    private static ?array $cases = null;

    /** @return list<array<string, mixed>> */
    public static function all(): array
    {
        if (self::$cases === null) {
            $data = json_decode((string) file_get_contents(__DIR__.'/../../Fixtures/shared/merge-cases.json'), true, 512, JSON_THROW_ON_ERROR);
            self::$cases = $data['serverCases'];
        }

        return self::$cases;
    }

    /** @return array<string, mixed> */
    public static function find(string $id): array
    {
        foreach (self::all() as $case) {
            if ($case['id'] === $id) {
                return $case;
            }
        }

        throw new \OutOfBoundsException("No server case {$id}");
    }
}
