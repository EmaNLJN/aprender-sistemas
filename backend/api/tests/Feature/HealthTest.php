<?php

use Illuminate\Support\Facades\DB;

it('responds 200 at /api/up', function () {
    $this->get('/api/up')->assertOk();
});

it('reports the status in JSON to whoever asks', function () {
    $this->getJson('/api/up')
        ->assertOk()
        ->assertExactJson(['status' => 'up']);
});

it('FR-009: /api/up neither creates a session row nor sets a cookie', function () {
    config(['session.driver' => 'database']);

    $response = $this->get('/api/up');

    expect(DB::table('sessions')->count())->toBe(0)
        ->and($response->headers->getCookies())->toBe([]);
});
