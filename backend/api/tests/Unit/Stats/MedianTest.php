<?php

use App\Stats\Median;

it('takes the middle value of an odd number of observations', function () {
    expect(Median::of([0 => 1, 1 => 1, 2 => 1]))->toBe(1)
        ->and(Median::of([2 => 1, 0 => 1, 1 => 1]))->toBe(1)
        ->and(Median::of([1 => 3]))->toBe(1);
});

it('averages the two middle values of an even number of observations', function () {
    expect(Median::of([0 => 1, 1 => 1]))->toBe(0.5)
        ->and(Median::of([1 => 1, 3 => 1]))->toBe(2)
        ->and(Median::of([0 => 2, 5 => 2]))->toBe(2.5);
});

it('has no median without observations', function () {
    expect(Median::of([]))->toBeNull()
        ->and(Median::of([4 => 0]))->toBeNull();
});
