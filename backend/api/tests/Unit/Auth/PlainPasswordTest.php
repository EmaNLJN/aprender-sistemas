<?php

use App\Auth\PlainPassword;

it('normalizes a decomposed accent to its composed form', function () {
    expect(PlainPassword::of("a\u{0301}")->value)->toBe("\u{00E1}");
});

it('counts characters and bytes of the normalized form', function (int $repetitions, int $characters, int $bytes) {
    $password = PlainPassword::of(str_repeat("a\u{0301}", $repetitions));

    expect($password->characters())->toBe($characters)->and($password->bytes())->toBe($bytes);
})->with([
    '15 accented letters' => [15, 15, 30],
    '40 accented letters' => [40, 40, 80],
]);

it('leaves an already composed password as it is', function () {
    expect(PlainPassword::of('correct horse')->value)->toBe('correct horse');
});
