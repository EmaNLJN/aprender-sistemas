<?php

use App\Auth\Email;

it('trims and lowercases an email', function () {
    expect(Email::canonical('  Ana@X.com '))->toBe('ana@x.com');
});

it('keeps accents', function () {
    expect(Email::canonical('PAPÁ@Ejemplo.com.ar'))->toBe('papá@ejemplo.com.ar');
});
