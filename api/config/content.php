<?php

// Contenido del taller (ADR 0006, C2).
return [

    // Dónde están curriculum.json y curriculum.meta.json, que genera tools/content/. La imagen los
    // copia a resources/content (etapa `curriculum` de api/Dockerfile).
    'path' => env('CONTENT_PATH', resource_path('content')),

    // Store de la caché de cuerpos (D11). Las pruebas usan el real: phpunit.xml pone
    // CACHE_STORE=array sólo para el store por omisión.
    'cache_store' => env('CONTENT_CACHE_STORE', 'database'),

    // Vida de cada cuerpo en la caché: sólo un respaldo, porque cada import renueva los 17 y borra
    // los de los hashes que reemplaza.
    'cache_days' => 30,

];
