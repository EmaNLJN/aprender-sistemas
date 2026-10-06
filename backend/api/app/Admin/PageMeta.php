<?php

namespace App\Admin;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final readonly class PageMeta
{
    /**
     * @param  LengthAwarePaginator<array-key, mixed>  $page
     * @return array{page: int, perPage: int, total: int, lastPage: int}
     */
    public static function of(LengthAwarePaginator $page): array
    {
        return [
            'page' => $page->currentPage(),
            'perPage' => $page->perPage(),
            'total' => $page->total(),
            'lastPage' => $page->lastPage(),
        ];
    }
}
