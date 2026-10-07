<?php

use App\Auth\PrivacyNotice;
use App\Models\User;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    config(['taller.privacy_version' => '2026-10-dev']);
});

it('says the current version from the configuration', function () {
    expect((new PrivacyNotice)->current())->toBe('2026-10-dev');
});

it('recognizes only the current version', function () {
    $notice = new PrivacyNotice;

    expect($notice->isCurrent('2026-10-dev'))->toBeTrue()
        ->and($notice->isCurrent('2026-09'))->toBeFalse()
        ->and($notice->isCurrent(''))->toBeFalse();
});

it('says an account has not accepted without a version', function () {
    expect((new PrivacyNotice)->acceptedBy(new User))->toBeFalse();
});

it('says an account has not accepted another version', function () {
    $user = (new User)->setRawAttributes(['privacy_version' => '2026-09']);

    expect((new PrivacyNotice)->acceptedBy($user))->toBeFalse();
});

it('says an account has accepted the current version', function () {
    $user = (new User)->setRawAttributes(['privacy_version' => '2026-10-dev']);

    expect((new PrivacyNotice)->acceptedBy($user))->toBeTrue();
});
