<?php

// ============================================================
// ARKZEN ENGINE — LARAVEL CONFIG
// Place this in /config/arkzen.php in your Laravel project
// ============================================================

return [

    // Secret key shared between frontend bridge and backend
    // Must match ARKZEN_ENGINE_SECRET in frontend .env.local
    'engine_secret' => env('ARKZEN_ENGINE_SECRET', 'arkzen-engine-secret'),

    // Paths where Arkzen generates files
    'paths' => [
        'models'      => app_path('Models/Arkzen'),
        'controllers' => app_path('Http/Controllers/Arkzen'),
        'migrations'  => database_path('migrations/arkzen'),
        'seeders'     => database_path('seeders/arkzen'),
        'routes'      => base_path('routes/modules'),
    ],

    // SQLite database path
    'database' => [
        'connection' => 'sqlite',
        'path'       => database_path('database.sqlite'),
    ],

];
