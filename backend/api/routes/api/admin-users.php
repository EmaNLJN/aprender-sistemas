<?php

use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware('admin')->prefix('admin')->group(function () {
    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/{user}', [UserController::class, 'show'])->where('user', '[0-9]{1,18}');
    Route::patch('/users/{user}', [UserController::class, 'update'])->where('user', '[0-9]{1,18}')->middleware('password.confirm');
    Route::post('/users/{user}/password-reset', [UserController::class, 'passwordReset'])->where('user', '[0-9]{1,18}')->middleware('password.confirm');
});
