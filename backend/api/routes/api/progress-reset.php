<?php

use App\Http\Controllers\ProgressResetController;
use App\Http\Middleware\PrivateNoStore;
use Illuminate\Support\Facades\Route;

Route::middleware([PrivateNoStore::class, 'account', 'password.confirm', 'throttle:reset'])->group(fn () => Route::post('/progress/reset', ProgressResetController::class));
