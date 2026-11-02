<?php

use App\Http\Controllers\Admin\StatsController;
use Illuminate\Support\Facades\Route;

Route::middleware('admin')->prefix('admin')->group(function () {
    Route::get('/stats/overview', [StatsController::class, 'overview']);
});
