<?php

use App\Http\Controllers\Auth\InvitationController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:invitations')->prefix('auth/invitations')->group(function () {
    Route::post('/lookup', [InvitationController::class, 'lookup']);
    Route::post('/accept', [InvitationController::class, 'accept']);
});
