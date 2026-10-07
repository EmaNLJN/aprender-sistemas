<?php

use Illuminate\Support\Facades\Route;
use Tests\Feature\Session\ProbeRoutes;

beforeEach(fn () => ProbeRoutes::register());

it('gives each request a 32 hex X-Request-Id, also visible to the code', function () {
    $response = $this->getJson('/api/probe/request-id')->assertOk();

    $header = $response->headers->get('X-Request-Id');

    expect($header)->toMatch('/^[0-9a-f]{32}$/')
        ->and($response->json('id'))->toMatch('/^[0-9a-f]{32}$/')
        ->and($response->json('id'))->toBe($header);
});

it('keeps the id Nginx sent', function () {
    $nginxId = str_repeat('ab', 16);

    $this->getJson('/api/probe/request-id', ['X-Request-Id' => $nginxId])
        ->assertHeader('X-Request-Id', $nginxId);
});

it('replaces an id that is not 32 hex, so a client cannot inject into the logs', function () {
    $response = $this->getJson('/api/probe/request-id', ['X-Request-Id' => "evil\nforged"]);

    expect($response->headers->get('X-Request-Id'))->toMatch('/^[0-9a-f]{32}$/');
});

it('answers a failing route with the id too', function () {
    Route::middleware('api')->prefix('api')->get('/probe/boom', fn () => throw new RuntimeException('boom'));

    $this->getJson('/api/probe/boom')->assertStatus(500)->assertHeader('X-Request-Id');
});
