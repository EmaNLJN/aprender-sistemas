<?php

use App\Content\Record\KeyOrder;

it('extracts the keys from a document record in document order', function () {
    expect(KeyOrder::of((object) ['b' => 1, 'a' => 2])->keys)->toBe(['b', 'a']);
});

it('encodes the keys as JSON', function () {
    expect(KeyOrder::of((object) ['id' => 1, 'title' => 'T'])->toRow())->toBe('["id","title"]');
});

it('reads the keys from a row', function () {
    expect(KeyOrder::fromRow('["title","id"]', ['id', 'title'])->keys)->toBe(['title', 'id']);
});

it('rejects a key that the record does not know', function () {
    expect(fn () => KeyOrder::fromRow('["id","extra"]', ['id']))
        ->toThrow(LogicException::class, 'La clave «extra» no tiene regla en su códec.');
});

it('publishes with the keys of this order', function () {
    $order = KeyOrder::of((object) ['title' => 'b', 'id' => 'a']);
    $published = $order->publish(['id' => 'a', 'title' => 'b', 'level' => null]);
    expect((array) $published)->toBe(['title' => 'b', 'id' => 'a']);
});

it('fails if a key is missing from the values', function () {
    $order = KeyOrder::of((object) ['id' => 1, 'title' => 'T']);
    expect(fn () => $order->publish(['id' => 'a']))
        ->toThrow(LogicException::class, 'La clave «title» no tiene regla en su códec.');
});

it('checks whether a key is in the order', function () {
    $order = KeyOrder::of((object) ['a' => 1, 'b' => 2]);
    expect($order->has('a'))->toBeTrue();
    expect($order->has('c'))->toBeFalse();
});
