<?php

use App\Http\Controllers\SyncController;
use Illuminate\Support\Facades\Route;

Route::middleware(['account', 'verified', 'throttle:sync'])->group(fn () => Route::post('/sync', SyncController::class));
