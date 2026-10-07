<?php

use App\Http\Controllers\Auth\ConfirmPasswordController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\MeController;
use App\Http\Controllers\SessionController;
use Illuminate\Support\Facades\Route;

Route::get('/session', [SessionController::class, 'show']);
Route::post('/auth/login', [LoginController::class, 'store']);

Route::middleware('account')->group(function () {
    Route::post('/auth/logout', [LogoutController::class, 'destroy']);
    Route::post('/auth/confirm-password', [ConfirmPasswordController::class, 'store']);
    Route::get('/auth/confirmed-password-status', [ConfirmPasswordController::class, 'status']);
    Route::patch('/me', [MeController::class, 'update']);
    Route::put('/me/password', [MeController::class, 'changePassword']);
    Route::post('/me/privacy', [MeController::class, 'acceptPrivacy']);
    Route::post('/me/sessions/logout-others', [MeController::class, 'logoutOthers']);
});
