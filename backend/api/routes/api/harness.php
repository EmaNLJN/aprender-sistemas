<?php

use App\Http\Controllers\ContentController;
use Illuminate\Support\Facades\Route;

Route::middleware(['account', 'verified'])->group(function () {
    Route::get('/harness', [ContentController::class, 'harness']);
});
