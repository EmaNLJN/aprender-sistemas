<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\LogoutController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [LoginController::class, 'store']);

Route::middleware('account')->group(function () {
    Route::post('/auth/logout', [LogoutController::class, 'destroy']);
});
