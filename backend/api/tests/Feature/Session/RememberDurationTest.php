<?php

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;

it('keeps the remember cookie for 30 days', function () {
    Carbon::setTestNow('2026-10-05 12:00:00');
    $user = User::factory()->create();

    Auth::guard('web')->login($user, remember: true);

    $remember = collect(Cookie::getQueuedCookies())->first(fn ($cookie) => str_starts_with($cookie->getName(), 'remember_web_'));
    expect($remember?->getExpiresTime())->toBe(Carbon::parse('2026-11-04 12:00:00')->getTimestamp());
});
