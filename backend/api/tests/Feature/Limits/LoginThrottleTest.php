<?php

use App\Auth\LoginThrottle;
use App\Auth\NetworkKey;
use App\Http\ApiCode;
use App\Http\ApiError;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Tests\Feature\Limits\DatabaseDrivers;

beforeEach(function () {
    DatabaseDrivers::useWithFixedClock();
    $this->throttle = app(LoginThrottle::class);
});

afterEach(fn () => Carbon\Carbon::setTestNow());

it('lets five attempts per email and network through and makes the sixth wait', function () {
    foreach (range(1, 5) as $attempt) {
        expect($this->throttle->hit('ana@x.com', '10.0.0.1'))->toBeNull();
    }

    $wait = $this->throttle->hit('ana@x.com', '10.0.0.1');

    expect($wait)->toBeInt()->toBeBetween(1, 60);
});

it('lets the email through again after 61 seconds', function () {
    foreach (range(1, 6) as $attempt) {
        $this->throttle->hit('ana@x.com', '10.0.0.1');
    }

    $this->travel(61)->seconds();

    expect($this->throttle->hit('ana@x.com', '10.0.0.1'))->toBeNull();
});

it('counts the same email separately for each network', function () {
    foreach (range(1, 6) as $attempt) {
        $this->throttle->hit('ana@x.com', '10.0.0.1');
    }

    expect($this->throttle->hit('ana@x.com', '10.0.0.2'))->toBeNull();
});

it('limits a network to 60 attempts a minute across different emails', function () {
    foreach (range(1, 60) as $number) {
        expect($this->throttle->hit("user{$number}@x.com", '10.0.0.1'))->toBeNull();
    }

    expect($this->throttle->hit('user61@x.com', '10.0.0.1'))->toBeBetween(1, 60)
        ->and($this->throttle->hit('user1@x.com', '10.0.0.2'))->toBeNull();
});

it('releases the email and network on clear but not the network counter', function () {
    foreach (range(1, 6) as $attempt) {
        $this->throttle->hit('ana@x.com', '10.0.0.1');
    }
    $this->throttle->clear('ana@x.com', '10.0.0.1');

    expect($this->throttle->hit('ana@x.com', '10.0.0.1'))->toBeNull();

    foreach (range(1, 53) as $number) {
        $this->throttle->hit("user{$number}@x.com", '10.0.0.1');
    }

    expect($this->throttle->hit('other@x.com', '10.0.0.1'))->toBeBetween(1, 60);
});

it('uses the REMOTE_ADDR and ignores X-Forwarded-For so the network limit cannot be evaded', function () {
    Route::post('/api/probe/login', function (Request $request) {
        $wait = app(LoginThrottle::class)->hit('ana@x.com', NetworkKey::of($request->ip()));

        return $wait === null
            ? response()->json(['ok' => true])
            : ApiError::of(ApiCode::TooManyRequests, headers: ['Retry-After' => (string) $wait]);
    });

    foreach (range(1, 6) as $number) {
        $response = $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.9'])
            ->withHeader('X-Forwarded-For', "203.0.113.{$number}")
            ->postJson('/api/probe/login');

        if ($number < 6) {
            $response->assertOk();
        }
    }

    $response->assertStatus(429)->assertHeader('Retry-After');
});
