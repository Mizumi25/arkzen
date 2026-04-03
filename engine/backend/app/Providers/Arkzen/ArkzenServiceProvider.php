<?php

// ============================================================
// ARKZEN ENGINE — SERVICE PROVIDER
// Fixed v4.1:
//   - Removed registerArkzenRoutes() — bootstrap/app.php handles it
//   - Removed 'cors' from registerModuleRoutes middleware (doesn't exist as alias)
//   - bootActiveTatemonos reads routes/modules/*.php correctly
// ============================================================

namespace App\Providers\Arkzen;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\File;
use App\Arkzen\Readers\RegistryReader;

class ArkzenServiceProvider extends ServiceProvider
{
    // ─────────────────────────────────────────────
    // BOOT
    // ─────────────────────────────────────────────

    public function boot(): void
    {
        $this->ensureDirectories();
        // NOTE: arkzen engine routes (/arkzen/health, /arkzen/build, /arkzen/remove)
        // are registered by bootstrap/app.php via the then: closure.
        // Do NOT register them here — it causes double registration.
        $this->bootActiveTatemonos();
    }

    // ─────────────────────────────────────────────
    // ENSURE REQUIRED DIRECTORIES EXIST
    // ─────────────────────────────────────────────

    private function ensureDirectories(): void
    {
        $dirs = [
            app_path('Http/Controllers/Arkzen'),
            app_path('Models/Arkzen'),
            database_path('migrations/arkzen'),
            database_path('seeders/arkzen'),
            base_path('routes/modules'),
        ];

        foreach ($dirs as $dir) {
            if (!File::isDirectory($dir)) {
                File::makeDirectory($dir, 0755, true);
            }
        }
    }

    // ─────────────────────────────────────────────
    // BOOT ALL ACTIVE TATEMONOS FROM REGISTRY
    // Reads arkzen.json and registers all active tatemono routes
    // ─────────────────────────────────────────────

    private function bootActiveTatemonos(): void
    {
        $registry = RegistryReader::read();

        if (empty($registry['modules'])) {
            return;
        }

        $activeModules = array_filter(
            $registry['modules'],
            fn($module) => $module['status'] === 'active'
        );

        foreach ($activeModules as $module) {
            self::registerModuleRoutes($module['name']);
        }
    }

    // ─────────────────────────────────────────────
    // REGISTER ROUTES FOR A SINGLE TATEMONO
    // ─────────────────────────────────────────────

    public static function registerModuleRoutes(string $tatemonoName): void
    {
        $routeFile = base_path("routes/modules/{$tatemonoName}.php");

        if (File::exists($routeFile)) {
            Route::middleware(['api'])
                ->group($routeFile);
        }
    }

    // ─────────────────────────────────────────────
    // REGISTER
    // ─────────────────────────────────────────────

    public function register(): void
    {
        $this->app->singleton(RegistryReader::class);
    }
}