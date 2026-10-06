<?php

use App\Http\Controllers\Admin\InvitationController;
use Illuminate\Support\Facades\Route;

Route::middleware('admin')->prefix('admin')->group(function () {
    Route::get('/invitations', [InvitationController::class, 'index']);
    Route::post('/invitations', [InvitationController::class, 'store']);
    Route::post('/invitations/{invitation}/resend', [InvitationController::class, 'resend'])->whereNumber('invitation');
    Route::delete('/invitations/{invitation}', [InvitationController::class, 'destroy'])->whereNumber('invitation');
});
