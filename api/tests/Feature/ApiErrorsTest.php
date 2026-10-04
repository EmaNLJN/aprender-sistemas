<?php

// Un navegador o curl no mandan Accept: application/json, y bajo /api/ la respuesta igual es
// JSON (shouldRenderJsonWhen en bootstrap/app.php), nunca la página HTML de Laravel.
it('responde 404 en JSON a una ruta desconocida bajo /api', function () {
    $this->get('/api/no-existe')
        ->assertNotFound()
        ->assertHeader('Content-Type', 'application/json')
        ->assertJsonStructure(['message']);
});
