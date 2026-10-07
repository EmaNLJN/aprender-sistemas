<?php

use App\Http\Controllers\Account\DeletionController;
use Illuminate\Support\Facades\Route;

Route::middleware('account')->delete('/me', [DeletionController::class, 'destroyOwn'])->middleware('password.confirm');

Route::middleware('admin')->prefix('admin')->group(function () {
    Route::delete('/users/{user}', [DeletionController::class, 'destroyUser'])->where('user', '[0-9]{1,18}')->middleware('password.confirm');
});
