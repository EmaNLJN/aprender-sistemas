<?php

use App\Http\Controllers\Auth\InvitationController;
use App\Http\Controllers\Auth\ResetPasswordController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:invitations')->prefix('auth/invitations')->group(function () {
    Route::post('/lookup', [InvitationController::class, 'lookup']);
    Route::post('/accept', [InvitationController::class, 'accept']);
});

Route::post('/auth/reset-password', ResetPasswordController::class)->middleware('throttle:reset-password');
