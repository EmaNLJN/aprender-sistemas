<?php

// /api/up es el health check de Laravel (bootstrap/app.php). Vive bajo /api/ para entrar por
// la misma location de Nginx que el resto de la API.
it('responde 200 en /api/up', function () {
    $this->get('/api/up')->assertOk();
});

it('informa el estado en JSON a quien lo pide', function () {
    $this->getJson('/api/up')
        ->assertOk()
        ->assertExactJson(['status' => 'up']);
});
