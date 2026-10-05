<?php

use App\Auth\NetworkKey;

it('keys an IPv4 address by itself', function () {
    expect(NetworkKey::of('203.0.113.7'))->toBe('203.0.113.7');
});

it('keys an IPv6 address by its /64 network', function () {
    expect(NetworkKey::of('2001:db8:1:2:aaaa:bbbb:cccc:dddd'))->toBe('v6:20010db800010002');
});

it('gives every host of the same /64 the same key', function (string $address) {
    expect(NetworkKey::of($address))->toBe('v6:20010db800010002');
})->with(['2001:db8:1:2::1', '2001:db8:1:2:ffff:ffff:ffff:ffff']);

it('gives a different /64 a different key', function () {
    expect(NetworkKey::of('2001:db8:1:3::1'))->toBe('v6:20010db800010003');
});

it('keys an IPv4-mapped IPv6 address as the IPv4 address', function () {
    expect(NetworkKey::of('::ffff:203.0.113.7'))->toBe('203.0.113.7');
});

it('keys a missing or invalid address as unknown', function (?string $address) {
    expect(NetworkKey::of($address))->toBe('unknown');
})->with([null, 'no-es-una-ip']);
