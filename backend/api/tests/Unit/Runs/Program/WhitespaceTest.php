<?php

use App\Runs\Program\Whitespace;

it('trims spaces, tabs, line feeds and carriage returns from both ends', function () {
    expect(Whitespace::trim("\t  a b\r\n"))->toBe('a b');
});

it('keeps the non-breaking space', function () {
    expect(Whitespace::trim("\u{A0}a\u{A0}"))->toBe("\u{A0}a\u{A0}");
});

it('turns a string of only whitespace into an empty string', function () {
    expect(Whitespace::trim(" \t\r\n "))->toBe('');
});
