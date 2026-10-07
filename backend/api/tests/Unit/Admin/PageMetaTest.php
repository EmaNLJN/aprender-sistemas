<?php

use App\Admin\PageMeta;
use Illuminate\Pagination\LengthAwarePaginator;

it('describes the second page of 140 elements in pages of 25', function () {
    $page = new LengthAwarePaginator(range(26, 50), 140, 25, 2);

    expect(PageMeta::of($page))->toBe(['page' => 2, 'perPage' => 25, 'total' => 140, 'lastPage' => 6]);
});

it('describes an empty list as a single empty page', function () {
    $page = new LengthAwarePaginator([], 0, 25, 1);

    expect(PageMeta::of($page))->toBe(['page' => 1, 'perPage' => 25, 'total' => 0, 'lastPage' => 1]);
});
