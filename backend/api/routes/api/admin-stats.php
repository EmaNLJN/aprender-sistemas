<?php

use App\Http\Controllers\Admin\StatsController;
use Illuminate\Support\Facades\Route;

Route::middleware('admin')->prefix('admin')->group(function () {
    Route::get('/stats/exercises', [StatsController::class, 'exercises']);
    Route::get('/stats/overview', [StatsController::class, 'overview']);
    Route::get('/stats/students', [StatsController::class, 'students']);
    Route::get('/stats/students/{user}', [StatsController::class, 'student'])->where('user', '[0-9]{1,18}');
});
