<?php

namespace Tests\Support;

use RuntimeException;
use stdClass;

final class ImportCases
{
    private const DIRECTORY = __DIR__.'/../Fixtures/shared';

    private const STORAGE_KEYS = [
        'route' => 'taller-learning-v1',
        'lab' => 'taller-laboratorio-v1',
        'campaign' => 'taller-campaign-v1',
        'systems' => 'taller-systems-v1',
    ];

    private const EXPORT_SUBOBJECTS = ['lab', 'campaign', 'systems'];

    /** @return array<string, array<string, mixed>> the cases by id */
    public static function all(?string $directory = null): array
    {
        $directory ??= self::DIRECTORY;
        $json = (string) file_get_contents($directory.'/import-cases.json');
        self::assertFrozen($json, $directory);

        $cases = [];
        foreach (json_decode($json, true, 512, JSON_THROW_ON_ERROR)['cases'] as $case) {
            $cases[$case['id']] = $case;
        }

        return $cases;
    }

    /** @return array<string, array{array<string, mixed>}> */
    public static function dataset(?string $directory = null): array
    {
        return array_map(fn (array $case) => [$case], self::all($directory));
    }

    /**
     * @param  array<string, mixed>  $case
     * @return array<string, stdClass> the sections that the raw carries, decoded with objects as stdClass
     */
    public static function rawSections(array $case): array
    {
        $raw = json_decode($case['raw'], false, 512, JSON_THROW_ON_ERROR);

        return $case['source'] === 'storage' ? self::storageSections($raw) : self::exportSections($raw);
    }

    /** @return array<string, stdClass> */
    private static function storageSections(stdClass $raw): array
    {
        $sections = [];
        foreach (self::STORAGE_KEYS as $section => $key) {
            if (property_exists($raw, $key)) {
                $sections[$section] = json_decode($raw->{$key}, false, 512, JSON_THROW_ON_ERROR);
            }
        }

        return $sections;
    }

    /** @return array<string, stdClass> */
    private static function exportSections(stdClass $raw): array
    {
        $route = clone $raw;
        unset($route->exportedAt);
        foreach (self::EXPORT_SUBOBJECTS as $section) {
            unset($route->{$section});
        }
        $sections = ['route' => $route];
        foreach (self::EXPORT_SUBOBJECTS as $section) {
            if (property_exists($raw, $section)) {
                $sections[$section] = $raw->{$section};
            }
        }

        return $sections;
    }

    private static function assertFrozen(string $json, string $directory): void
    {
        $frozen = explode(' ', trim((string) file_get_contents($directory.'/import-cases.sha256')))[0];
        if (hash('sha256', $json) !== $frozen) {
            throw new RuntimeException('import-cases.json es un fixture congelado: su huella no coincide con import-cases.sha256');
        }
    }
}
