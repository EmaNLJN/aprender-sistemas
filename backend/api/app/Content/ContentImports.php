<?php

namespace App\Content;

use Illuminate\Support\Facades\DB;
use LogicException;

/** Reads the latest import: one row by primary key. */
final class ContentImports
{
    public function latest(): ?LatestImport
    {
        $row = DB::table('content_imports')->orderByDesc('id')->first(['id', 'document_hash', 'source_commit', 'portion_hashes']);

        return $row === null
            ? null
            : new LatestImport((int) $row->id, $row->document_hash, $row->source_commit, $this->portionHashes($row->portion_hashes));
    }

    /** @return array<string, string> */
    private function portionHashes(string $json): array
    {
        $decoded = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        if (! is_array($decoded)) {
            throw new LogicException('content_imports.portion_hashes no es un objeto');
        }
        $hashes = [];
        foreach ($decoded as $portion => $hash) {
            if (! is_string($portion) || ! is_string($hash)) {
                throw new LogicException('content_imports.portion_hashes tiene una huella que no es texto');
            }
            $hashes[$portion] = $hash;
        }

        return $hashes;
    }
}
