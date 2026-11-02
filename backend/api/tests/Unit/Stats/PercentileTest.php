<?php

use App\Stats\Percentile;

it('takes the nearest rank', function () {
    expect(Percentile::of([40, 10, 30, 20], 50))->toBe(20)
        ->and(Percentile::of([40, 10, 30, 20], 95))->toBe(40)
        ->and(Percentile::of([1500], 95))->toBe(1500);
});

it('has no percentile without values', function () {
    expect(Percentile::of([], 50))->toBeNull();
});
