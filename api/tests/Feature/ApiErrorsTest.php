<?php

// Un navegador o curl no mandan Accept: application/json, y bajo /api/ la respuesta igual es
// JSON (shouldRenderJsonWhen en bootstrap/app.php), nunca la página HTML de Laravel.
it('responde 404 en JSON a una ruta desconocida bajo /api', function () {
    $this->get('/api/no-existe')
        ->assertNotFound()
        ->assertHeader('Content-Type', 'application/json')
        ->assertJsonStructure(['message']);
});

// Laravel recorta la barra final: la raíz /api/ llega como `api`, que `api/*` no cubre.
it('responde 404 en JSON también en la raíz /api/', function () {
    $this->get('/api/')
        ->assertNotFound()
        ->assertHeader('Content-Type', 'application/json');
});

// Nginx normaliza /x/../api/zzz y entra por /api/, pero PHP recibe el REQUEST_URI crudo: el
// error igual tiene que ser JSON.
it('responde JSON aunque la ruta cruda no empiece con /api', function () {
    $this->get('/fuera')
        ->assertNotFound()
        ->assertHeader('Content-Type', 'application/json');
});
