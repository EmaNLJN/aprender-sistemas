<?php

use App\Http\Controllers\ProgressController;
use App\Http\Middleware\PrivateNoStore;
use Illuminate\Support\Facades\Route;

Route::middleware([PrivateNoStore::class, 'account', 'verified'])->group(function () {
    Route::get('/progress', [ProgressController::class, 'show']);
});
