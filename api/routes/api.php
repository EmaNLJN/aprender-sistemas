<?php

use App\Http\Controllers\ContentController;
use Illuminate\Support\Facades\Route;

// Rutas de la API del taller. bootstrap/app.php les antepone /api y el grupo de middleware
// `api`. El health check /api/up lo registra el framework, no este archivo.

// Contenido (C2, ADR 0006 §7): una porción por recurso, con ETag y 304. Sin sesión hasta C3: el
// puerto sólo escucha en 127.0.0.1, y C3 pone estas rutas detrás de ella. Sin throttle de Laravel.
Route::get('/exercises', [ContentController::class, 'exercises']);
Route::get('/exercises/{id}', [ContentController::class, 'exercise']);
Route::get('/worlds', [ContentController::class, 'worlds']);
Route::get('/workshops', [ContentController::class, 'workshops']);
Route::get('/atlas', [ContentController::class, 'atlas']);
Route::get('/guide', [ContentController::class, 'guide']);
