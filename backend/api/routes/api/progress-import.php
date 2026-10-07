<?php

use App\Http\Controllers\ProgressImportController;
use App\Http\Middleware\PrivateNoStore;
use Illuminate\Support\Facades\Route;

Route::middleware([PrivateNoStore::class, 'account', 'verified', 'throttle:import'])
    ->group(fn () => Route::post('/progress/import', ProgressImportController::class));
