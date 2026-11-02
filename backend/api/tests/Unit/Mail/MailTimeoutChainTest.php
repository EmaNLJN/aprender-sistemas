<?php

use App\Jobs\SendMail;
use Illuminate\Queue\Attributes\Timeout;
use Tests\TestCase;

uses(TestCase::class);

it('keeps the SMTP wait below the job timeout and the job timeout below the retry window', function () {
    $attributes = (new ReflectionClass(SendMail::class))->getAttributes(Timeout::class);
    $jobTimeout = $attributes[0]->newInstance()->timeout;

    expect(config()->integer('mail.mailers.smtp.timeout'))->toBeLessThan($jobTimeout)
        ->and($jobTimeout)->toBeLessThan(config()->integer('queue.connections.mail.retry_after'));
});
