<?php

it('responds 404 in JSON to an unknown route under /api', function () {
    $this->get('/api/no-existe')
        ->assertNotFound()
        ->assertHeader('Content-Type', 'application/json')
        ->assertJsonStructure(['message'])
        ->assertJsonPath('code', 'not_found');
});

it('responds 404 in JSON also at the /api/ root', function () {
    $this->get('/api/')
        ->assertNotFound()
        ->assertHeader('Content-Type', 'application/json');
});

it('responds JSON even if the raw path does not start with /api', function () {
    $this->get('/fuera')
        ->assertNotFound()
        ->assertHeader('Content-Type', 'application/json')
        ->assertJsonPath('code', 'not_found');
});
