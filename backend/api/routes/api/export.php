<?php

use App\Http\Controllers\Account\ExportController;
use Illuminate\Support\Facades\Route;

Route::post('/me/export', ExportController::class)->middleware(['account', 'password.confirm']);
