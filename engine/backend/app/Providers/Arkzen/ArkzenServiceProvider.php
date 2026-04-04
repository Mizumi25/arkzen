<?php

namespace App\Providers\Arkzen;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Config;
use App\Arkzen\Readers\RegistryReader;

class ArkzenServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->ensureDirectories();
        $this->registerSqliteConnections();  // <-- ADD THIS LINE
        $this->bootActiveTatemonos();
    }

    // ─────────────────────────────────────────────
    // NEW METHOD: Register all SQLite connections
    // ─────────────────────────────────────────────
    
    private function registerSqliteConnections(): void
    {
        $arkzenDbDir = database_path('arkzen');
        
        if (!File::exists($arkzenDbDir)) {
            return;
        }
        
        // Scan all SQLite files in database/arkzen/
        $dbFiles = File::glob($arkzenDbDir . '/*.sqlite');
        
        foreach ($dbFiles as $dbFile) {
            $slug = basename($dbFile, '.sqlite');  // "inventory-management"
            $connection = str_replace('-', '_', $slug);  // "inventory_management"
            
            // Check if connection already exists
            if (!Config::has("database.connections.{$connection}")) {
                Config::set("database.connections.{$connection}", [
                    'driver' => 'sqlite',
                    'database' => $dbFile,
                    'prefix' => '',
                    'foreign_key_constraints' => true,
                ]);
                
                \Log::info("[Arkzen] Registered SQLite connection: {$connection} → {$slug}.sqlite");
            }
        }
    }

    // ... rest of your existing code stays exactly the same ...
    
    private function ensureDirectories(): void
    {
        $dirs = [
            app_path('Http/Controllers/Arkzen'),
            app_path('Models/Arkzen'),
            database_path('migrations/arkzen'),
            database_path('seeders/arkzen'),
            base_path('routes/modules'),
            database_path('arkzen'),  // <-- ADD THIS LINE
        ];

        foreach ($dirs as $dir) {
            if (!File::isDirectory($dir)) {
                File::makeDirectory($dir, 0755, true);
            }
        }
    }

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

    public static function registerModuleRoutes(string $tatemonoName): void
    {
        $routeFile = base_path("routes/modules/{$tatemonoName}.php");

        if (File::exists($routeFile)) {
            Route::middleware(['api'])
                ->group($routeFile);
        }
    }

    public function register(): void
    {
        $this->app->singleton(RegistryReader::class);
    }
}