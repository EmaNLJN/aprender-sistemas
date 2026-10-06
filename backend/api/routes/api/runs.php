<?php

use App\Http\Controllers\RunController;
use App\Http\Middleware\PrivateNoStore;
use Illuminate\Support\Facades\Route;

Route::middleware([PrivateNoStore::class, 'account', 'verified'])->group(function () {
    Route::post('/runs', [RunController::class, 'store'])->middleware('throttle:runs-submit');
    Route::get('/runs/{id}', [RunController::class, 'show']);
    Route::post('/runs/{id}/cancel', [RunController::class, 'cancel']);
});
