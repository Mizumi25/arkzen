<?php

// ============================================================
// ARKZEN ENGINE — INTERNAL ROUTES
// These routes are for the engine itself, not client features
// Protected by arkzen.engine middleware
// ============================================================

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Arkzen\ArkzenEngineController;

// Health check — frontend bridge pings this on startup
Route::get('/health', [ArkzenEngineController::class, 'health']);

// Build — receives tatemono data and builds everything
Route::post('/build', [ArkzenEngineController::class, 'build']);

// Remove — removes generated files for a tatemono
Route::post('/remove', [ArkzenEngineController::class, 'remove']);
