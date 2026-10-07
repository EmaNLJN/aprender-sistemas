<?php

namespace App\Admin;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final readonly class PageMeta
{
    /**
     * @template TKey of array-key
     * @template TValue
     *
     * @param  LengthAwarePaginator<TKey, TValue>  $page
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
