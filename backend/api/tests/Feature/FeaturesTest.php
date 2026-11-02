<?php

use App\Auth\Features;

it('gates registration on both the mail channel and the registration switch', function (bool $available, bool $open, bool $reset, bool $registration) {
    config(['taller.mail.required' => ! $available, 'mail.default' => 'array', 'taller.registration.open' => $open]);

    $features = app(Features::class);

    expect($features->passwordReset())->toBe($reset)
        ->and($features->registration())->toBe($registration);
})->with([
    'no mail and open registration' => [false, true, false, false],
    'mail and closed registration' => [true, false, true, false],
    'mail and open registration' => [true, true, true, true],
]);
