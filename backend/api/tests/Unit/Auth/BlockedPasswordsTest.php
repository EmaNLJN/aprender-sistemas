<?php

use App\Auth\BlockedPasswords;
use App\Auth\PasswordPolicy;
use App\Auth\PlainPassword;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

const BLOCKED_SAMPLE = __DIR__.'/../../Support/fixtures/blocked-sample.txt';

it('finds each entry of the sample list', function (string $entry) {
    expect((new BlockedPasswords(BLOCKED_SAMPLE))->contains($entry))->toBeTrue();
})->with(['passwordpassword1', 'qwertyuiopasdfgh', 'letmeinletmein123']);

it('ignores case when it searches', function () {
    expect((new BlockedPasswords(BLOCKED_SAMPLE))->contains('QwertyUIOPasdfgh'))->toBeTrue();
});

it('does not find a password that is not in the list', function () {
    expect((new BlockedPasswords(BLOCKED_SAMPLE))->contains('x7Kp2mQ9vL4tZ8w'))->toBeFalse();
});

it('does not match part of an entry', function () {
    expect((new BlockedPasswords(BLOCKED_SAMPLE))->contains('passwordpassword'))->toBeFalse();
});

it('fails loudly when the list does not exist', function () {
    (new BlockedPasswords(__DIR__.'/no-such-list.txt'))->contains('anything');
})->throws(RuntimeException::class);

describe('with the application', function () {
    uses(TestCase::class);

    it('never sends a request while it evaluates a policy', function () {
        Http::fake();

        (new PasswordPolicy(new BlockedPasswords(BLOCKED_SAMPLE)))
            ->violations(PlainPassword::of('x7Kp2mQ9vL4tZ8w'), 'Ana Luz', 'ana@x.com');

        Http::assertNothingSent();
    });
});
