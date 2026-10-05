<?php

use App\Http\Controllers\ContentController;
use Illuminate\Support\Facades\Route;

// Content (C2, ADR 0006 §7): public until C3 puts it behind a session, and no Laravel throttle.
Route::get('/exercises', [ContentController::class, 'exercises']);
Route::get('/exercises/{id}', [ContentController::class, 'exercise'])->where('id', '.+');
Route::get('/worlds', [ContentController::class, 'worlds']);
Route::get('/workshops', [ContentController::class, 'workshops']);
Route::get('/atlas', [ContentController::class, 'atlas']);
Route::get('/guide', [ContentController::class, 'guide']);
