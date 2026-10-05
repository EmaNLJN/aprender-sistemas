<?php

// La API es del mismo origen que el front (ADR 0004): sin CORS. Con credenciales (C3), un CORS
// abierto reflejaría el Origin pedido y permitiría leer respuestas desde cualquier sitio.
it('no habilita CORS para otro origen', function () {
    $this->withHeaders(['Origin' => 'https://otro.example'])
        ->get('/api/up')
        ->assertOk()
        ->assertHeaderMissing('Access-Control-Allow-Origin');
});

it('no responde un preflight de CORS', function () {
    $this->call('OPTIONS', '/api/up', [], [], [], [
        'HTTP_ORIGIN' => 'https://otro.example',
        'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
    ])->assertHeaderMissing('Access-Control-Allow-Origin');
});
