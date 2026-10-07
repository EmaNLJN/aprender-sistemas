<?php

use Tests\Support\ImportCases;

function importCasesFixture(): array
{
    $storageRaw = json_encode([
        'taller-learning-v1' => json_encode(['version' => 1, 'language' => 'go']),
        'taller-systems-v1' => json_encode(['version' => 1, 'records' => new stdClass]),
    ]);
    $exportRaw = json_encode([
        'version' => 1,
        'language' => 'rust',
        'exportedAt' => '2026-10-06T00:00:00.000Z',
        'lab' => ['version' => 1, 'records' => new stdClass, 'selected' => ['rust' => null, 'go' => null]],
        'campaign' => ['version' => 1, 'seals' => new stdClass, 'checkpoints' => new stdClass],
        'systems' => ['version' => 1, 'records' => new stdClass],
    ]);

    return [
        'format' => 1,
        'cases' => [
            ['id' => 'small-storage', 'source' => 'storage', 'fixture' => 'qa/fixtures/a.json', 'raw' => $storageRaw, 'normalized' => ['route' => ['version' => 1, 'language' => 'go']], 'expect' => ['written' => ['exercises' => 0]]],
            ['id' => 'small-export', 'source' => 'export', 'fixture' => 'qa/fixtures/b.json', 'raw' => $exportRaw, 'normalized' => ['route' => ['version' => 1, 'language' => 'rust']], 'expect' => ['written' => ['exercises' => 0]]],
        ],
    ];
}

function importCasesDirectory(?string $json = null, ?string $frozenHash = null): string
{
    $directory = sys_get_temp_dir().'/import-cases-'.bin2hex(random_bytes(6));
    mkdir($directory);
    $json ??= json_encode(importCasesFixture());
    file_put_contents($directory.'/import-cases.json', $json);
    file_put_contents($directory.'/import-cases.sha256', ($frozenHash ?? hash('sha256', $json))."  import-cases.json\n");

    return $directory;
}

it('reads the cases of a frozen fixture by id', function () {
    $cases = ImportCases::all(importCasesDirectory());

    expect(array_keys($cases))->toBe(['small-storage', 'small-export'])
        ->and($cases['small-export']['source'])->toBe('export')
        ->and($cases['small-storage']['normalized'])->toBe(['route' => ['version' => 1, 'language' => 'go']]);
});

it('refuses a fixture edited without its hash', function () {
    $edited = str_replace('small-export', 'small-edited', json_encode(importCasesFixture()));
    $directory = importCasesDirectory($edited, hash('sha256', json_encode(importCasesFixture())));

    expect(fn () => ImportCases::all($directory))->toThrow(RuntimeException::class, 'es un fixture congelado');
});

it('offers every case as a dataset entry named by its id', function () {
    $dataset = ImportCases::dataset(importCasesDirectory());

    expect(array_keys($dataset))->toBe(['small-storage', 'small-export'])
        ->and($dataset['small-storage'][0]['id'])->toBe('small-storage');
});

it('reads the sections of a storage raw as one JSON text per key, and leaves out the ones that are missing', function () {
    $case = ImportCases::all(importCasesDirectory())['small-storage'];

    $sections = ImportCases::rawSections($case);

    expect(array_keys($sections))->toBe(['route', 'systems'])
        ->and($sections['route'])->toEqual((object) ['version' => 1, 'language' => 'go'])
        ->and($sections['systems'])->toEqual((object) ['version' => 1, 'records' => new stdClass]);
});

it('reads the sections of an export raw as its first level without the subobjects and the export date', function () {
    $case = ImportCases::all(importCasesDirectory())['small-export'];

    $sections = ImportCases::rawSections($case);

    expect(array_keys($sections))->toBe(['route', 'lab', 'campaign', 'systems'])
        ->and($sections['route'])->toEqual((object) ['version' => 1, 'language' => 'rust'])
        ->and($sections['lab']->selected)->toEqual((object) ['rust' => null, 'go' => null]);
});

it('is the frozen fixture of the repository when read from its real path', function () {
    $cases = ImportCases::all();

    expect(array_keys($cases))->toBe(['master-2a278ad-storage', 'master-2a278ad-export', 'd0e1b49-export'])
        ->and($cases['d0e1b49-export']['expect']['written']['workshops'])->toBe(50)
        ->and(strlen($cases['master-2a278ad-storage']['raw']))->toBe(13633);
});
