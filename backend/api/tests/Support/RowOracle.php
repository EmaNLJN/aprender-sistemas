<?php

namespace Tests\Support;

use App\Content\ContentTables;
use App\Content\PublishedJson;
use LogicException;

/**
 * The row oracle of C6 (specs/002-c6-registros-tipados, FR-006): a digest per table of the rows the
 * import builds for a document. Values are compared as the import's difference compares them
 * (text, NULL apart), and rows and columns are sorted, so only what MySQL would store counts. It
 * lives while C6 does: after C6 there is no C2 code left to regenerate it.
 */
final class RowOracle
{
    /**
     * @param  array<string, list<array<string, int|string|null>>>  $tables  RowSet::toArray()
     * @return array<string, array{rows: int, sha256: string}>
     */
    public static function digest(array $tables): array
    {
        $digest = [];
        foreach ($tables as $table => $rows) {
            $normalized = [];
            foreach ($rows as $row) {
                ksort($row, SORT_STRING);
                $normalized[ContentTables::keyOf($table, $row)] = array_map(
                    fn (int|string|null $value): ?string => $value === null ? null : (string) $value,
                    $row,
                );
            }
            ksort($normalized, SORT_STRING);
            $digest[$table] = [
                'rows' => count($normalized),
                'sha256' => hash('sha256', PublishedJson::encode(array_values($normalized))),
            ];
        }
        ksort($digest, SORT_STRING);

        return $digest;
    }

    /** @return array{documentHash: string, tables: array<string, array{rows: int, sha256: string}>} */
    public static function read(): array
    {
        $path = __DIR__.'/row-oracle.json';
        if (! is_file($path)) {
            throw new LogicException('Falta tests/Support/row-oracle.json: generalo con print-row-oracle.php sobre el código de C2 (specs/002-c6-registros-tipados/quickstart.md, escenario 1).');
        }

        return json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
    }
}
