<?php

use App\Auth\PrivacyNotice;
use App\Models\User;
use App\Support\Iso8601;
use Illuminate\Support\Carbon;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    config(['taller.privacy_version' => '2026-10-dev']);
});

function userThatCountsSaves(): User
{
    return new class extends User
    {
        public int $saves = 0;

        public function save(array $options = []): bool
        {
            $this->saves++;

            return true;
        }
    };
}

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

it('records the current version and the instant, and saves', function () {
    Carbon::setTestNow('2026-10-12 15:30:00');
    $user = userThatCountsSaves();

    (new PrivacyNotice)->accept($user);

    expect($user->getAttribute('privacy_version'))->toBe('2026-10-dev')
        ->and(Iso8601::utc(Carbon::parse($user->getAttribute('privacy_accepted_at'))))->toBe('2026-10-12T15:30:00.000Z')
        ->and($user->saves)->toBe(1)
        ->and((new PrivacyNotice)->acceptedBy($user))->toBeTrue();
});
