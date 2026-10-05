<?php

it('responds 200 at /api/up', function () {
    $this->get('/api/up')->assertOk();
});

it('reports the status in JSON to whoever asks', function () {
    $this->getJson('/api/up')
        ->assertOk()
        ->assertExactJson(['status' => 'up']);
});
