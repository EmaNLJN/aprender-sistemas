<?php

use App\Auth\PrivacyNotice;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

it('stores the accepted version and instant on the account row', function () {
    config(['taller.privacy_version' => '2026-10-dev']);
    Carbon::setTestNow('2026-10-12 15:30:00.250');
    $user = User::factory()->create();

    (new PrivacyNotice)->accept($user);

    $row = DB::table('users')->where('id', $user->id)->first();
    expect($row->privacy_version)->toBe('2026-10-dev')
        ->and($row->privacy_accepted_at)->toBe('2026-10-12 15:30:00.250')
        ->and((new PrivacyNotice)->acceptedBy($user->fresh()))->toBeTrue();
});
