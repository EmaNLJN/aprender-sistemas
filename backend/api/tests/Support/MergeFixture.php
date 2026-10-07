<?php

namespace Tests\Support;

final class MergeFixture
{
    private const DIRECTORY = __DIR__.'/../Fixtures/shared/';

    /** @var ?array<string, mixed> */
    private static ?array $data = null;

    public static function actualHash(): string
    {
        return hash_file('sha256', self::DIRECTORY.'merge-cases.json') ?: '';
    }

    public static function frozenHash(): string
    {
        return explode(' ', trim((string) file_get_contents(self::DIRECTORY.'merge-cases.sha256')))[0];
    }

    /** @return list<string> */
    public static function routeMilestones(): array
    {
        return json_decode((string) file_get_contents(self::DIRECTORY.'route-milestones.json'), true, 512, JSON_THROW_ON_ERROR);
    }

    /** @return array<string, mixed> */
    public static function world(): array
    {
        return self::data()['world'];
    }

    /** @return array<string, array<string, mixed>> */
    public static function kinds(): array
    {
        return self::data()['kinds'];
    }

    /** @return array<string, array<string, mixed>> the merge cases that PHP runs, by id */
    public static function mergeCases(): array
    {
        $cases = [];
        foreach (self::data()['cases'] as $case) {
            if (($case['only'] ?? null) !== 'ts') {
                $cases[$case['id']] = $case;
            }
        }

        return $cases;
    }

    /** @return array<string, array{array<string, mixed>}> */
    public static function mergeCaseDataset(): array
    {
        return array_map(fn (array $case) => [$case], self::mergeCases());
    }

    /** @return array<string, mixed> */
    private static function data(): array
    {
        return self::$data ??= json_decode((string) file_get_contents(self::DIRECTORY.'merge-cases.json'), true, 512, JSON_THROW_ON_ERROR);
    }
}
