<?php

use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware('admin')->prefix('admin')->group(function () {
    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/{user}', [UserController::class, 'show'])->whereNumber('user');
    Route::patch('/users/{user}', [UserController::class, 'update'])->whereNumber('user')->middleware('password.confirm');
    Route::post('/users/{user}/password-reset', [UserController::class, 'passwordReset'])->whereNumber('user')->middleware('password.confirm');
});
