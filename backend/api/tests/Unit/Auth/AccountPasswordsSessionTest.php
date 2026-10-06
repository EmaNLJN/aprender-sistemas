<?php

use App\Auth\AccountPasswords;
use App\Auth\PlainPassword;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('closes the other sessions with the composed form of a password set decomposed', function () {
    config(['hashing.bcrypt.rounds' => 4]);
    $passwords = new AccountPasswords;
    $user = User::factory()->create();
    $passwords->set($user, PlainPassword::of("pa\u{0301}-pa\u{0301}-pa\u{0301}-pa\u{0301}"));
    $user->save();
    $this->actingAs($user);

    $passwords->signOutOtherDevices(PlainPassword::of("p\u{00E1}-p\u{00E1}-p\u{00E1}-p\u{00E1}"));

    expect($passwords->verify($user->fresh() ?? $user, PlainPassword::of("p\u{00E1}-p\u{00E1}-p\u{00E1}-p\u{00E1}")))->toBeTrue();
});
