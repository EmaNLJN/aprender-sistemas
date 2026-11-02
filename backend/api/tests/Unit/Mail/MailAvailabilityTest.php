<?php

use App\Mail\MailAvailability;
use Tests\TestCase;

uses(TestCase::class);

it('decides mail availability from the required flag and the configured transport', function (bool $required, string $mailer, string $transport, bool $expected) {
    config([
        'taller.mail.required' => $required,
        'mail.default' => $mailer,
        "mail.mailers.{$mailer}.transport" => $transport,
    ]);

    expect(app(MailAvailability::class)->isAvailable())->toBe($expected);
})->with([
    'required log' => [true, 'log', 'log', false],
    'required array' => [true, 'array', 'array', false],
    'required smtp' => [true, 'smtp', 'smtp', true],
    'optional log' => [false, 'log', 'log', true],
    'custom log transport' => [true, 'custom', 'log', false],
]);
