<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\SessionController;
use Illuminate\Support\Facades\Route;

Route::get('/session', [SessionController::class, 'show']);
Route::post('/auth/login', [LoginController::class, 'store']);

Route::middleware('account')->group(function () {
    Route::post('/auth/logout', [LogoutController::class, 'destroy']);
});
