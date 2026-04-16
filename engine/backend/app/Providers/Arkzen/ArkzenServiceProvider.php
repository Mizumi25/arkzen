<?php

namespace App\Providers\Arkzen;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Config;
use App\Arkzen\Readers\RegistryReader;
use Illuminate\Support\Facades\Auth; 


class ArkzenServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->ensureDirectories();
        $this->registerSqliteConnections();
        $this->ensureReverbConfig();
        $this->bootActiveTatemonos();
    }

    private function registerSqliteConnections(): void
    {
        $arkzenDbDir = database_path('arkzen');
        
        if (!File::exists($arkzenDbDir)) {
            return;
        }
        
        $dbFiles = File::glob($arkzenDbDir . '/*.sqlite');
        
        foreach ($dbFiles as $dbFile) {
            $slug = basename($dbFile, '.sqlite');
            $connection = str_replace('-', '_', $slug);
            
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

    private function ensureReverbConfig(): void
    {
        // Ensure Reverb environment variables exist
        $envPath = base_path('.env');
        if (!File::exists($envPath)) {
            return;
        }
        
        $reverbVars = [
            'BROADCAST_CONNECTION' => 'reverb',
            'REVERB_APP_ID' => config('arkzen.reverb.app_id', 'arkzen'),
            'REVERB_APP_KEY' => config('arkzen.reverb.app_key', 'arkzen-key'),
            'REVERB_APP_SECRET' => config('arkzen.reverb.app_secret', 'arkzen-secret'),
            'REVERB_HOST' => config('arkzen.reverb.host', 'localhost'),
            'REVERB_PORT' => config('arkzen.reverb.port', 8080),
            'REVERB_SCHEME' => config('arkzen.reverb.scheme', 'http'),
        ];
        
        $content = File::get($envPath);
        $changed = false;
        
        foreach ($reverbVars as $key => $value) {
            if (!str_contains($content, "{$key}=")) {
                File::append($envPath, "\n{$key}={$value}");
                $changed = true;
            }
        }
        
        if ($changed) {
            \Log::info('[Arkzen] Reverb environment variables added to .env');
        }
    }

    private function ensureDirectories(): void
    {
        $dirs = [
            app_path('Http/Controllers/Arkzen'),
            app_path('Models/Arkzen'),
            database_path('migrations/arkzen'),
            database_path('seeders/arkzen'),
            base_path('routes/modules'),
            database_path('arkzen'),
            config_path(),
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
      // 🔧 Wait for the 'auth' service to be resolved, then extend the Sanctum guard.
      // This gives the guard a proper 'users' provider, fixing the 401 Unauthenticated
      // error without breaking isolated User models or requiring a static auth.php file.
      $this->app->afterResolving('auth', function ($auth) {
          $auth->extend('sanctum', function ($app, $name, array $config) {
              return new \Laravel\Sanctum\Guard(
                  $auth->createUserProvider('users'),
                  $app['request']
              );
          });
      });
  
      $this->app->singleton(RegistryReader::class);
  }
}