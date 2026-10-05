<?php

namespace App\Content;

use Illuminate\Support\Facades\DB;

/** Reads the latest import: one row by primary key. */
final class ContentImports
{
    public function latest(): ?LatestImport
    {
        $row = DB::table('content_imports')->orderByDesc('id')->first(['id', 'document_hash', 'source_commit', 'portion_hashes']);

        return $row === null
            ? null
            : new LatestImport((int) $row->id, $row->document_hash, $row->source_commit, json_decode($row->portion_hashes, true, 512, JSON_THROW_ON_ERROR));
    }
}
