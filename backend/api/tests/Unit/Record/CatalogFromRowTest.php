<?php

use App\Content\Record\Catalog;

it('reads a catalog back from a row as the driver returns it', function () {
    expect(Catalog::fromRow(['code' => 'chain', 'slice_by' => 'language', 'chain_position' => '3']))
        ->toEqual(new Catalog('chain', 'language', 3));
});

it('reads a catalog without a chain position', function () {
    expect(Catalog::fromRow(['code' => 'cores', 'slice_by' => 'domain', 'chain_position' => null]))
        ->toEqual(new Catalog('cores', 'domain', null));
});

it('publishes the three keys of the contract', function () {
    expect((new Catalog('chain', 'language', 3))->toPublished())
        ->toBe(['code' => 'chain', 'sliceBy' => 'language', 'chainPosition' => 3]);
    expect((new Catalog('cores', 'domain', null))->toPublished())
        ->toBe(['code' => 'cores', 'sliceBy' => 'domain', 'chainPosition' => null]);
});

it('fails on a row without a column', function () {
    expect(fn () => Catalog::fromRow(['code' => 'cores', 'slice_by' => 'domain']))
        ->toThrow(LogicException::class, 'catalogs: a la fila le falta la columna chain_position');
});
