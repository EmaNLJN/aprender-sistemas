<?php

namespace App\Content;

use App\Content\Record\Catalog;
use Illuminate\Support\Facades\DB;

final class ActiveCatalogs
{
    /** @return list<array{code: string, sliceBy: string, chainPosition: int|null}> */
    public function published(): array
    {
        $rows = DB::table('catalogs')
            ->where('status', 'active')
            ->orderByRaw('`chain_position` IS NULL')
            ->orderBy('chain_position')
            ->orderBy('code')
            ->get(['code', 'slice_by', 'chain_position']);

        $catalogs = [];
        foreach ($rows as $row) {
            $catalogs[] = Catalog::fromRow((array) $row)->toPublished();
        }

        return $catalogs;
    }
}
