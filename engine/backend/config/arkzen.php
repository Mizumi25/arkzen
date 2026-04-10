<?php

// ============================================================
// ARKZEN ENGINE — LARAVEL CONFIG
// ============================================================

return [

    'engine_secret' => env('ARKZEN_ENGINE_SECRET', 'arkzen-engine-secret'),

    'paths' => [
        'models'      => app_path('Models/Arkzen'),
        'controllers' => app_path('Http/Controllers/Arkzen'),
        'migrations'  => database_path('migrations/arkzen'),
        'seeders'     => database_path('seeders/arkzen'),
        'routes'      => base_path('routes/modules'),
    ],

    'database' => [
        'connection' => 'sqlite',
        'path'       => database_path('database.sqlite'),
    ],

    // Reverb broadcasting configuration
    'reverb' => [
        'app_id' => env('REVERB_APP_ID', 'arkzen'),
        'app_key' => env('REVERB_APP_KEY', 'arkzen-key'),
        'app_secret' => env('REVERB_APP_SECRET', 'arkzen-secret'),
        'host' => env('REVERB_HOST', 'localhost'),
        'port' => env('REVERB_PORT', 8080),
        'scheme' => env('REVERB_SCHEME', 'http'),
    ],

];