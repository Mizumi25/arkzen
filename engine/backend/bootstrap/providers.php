<?php

use App\Providers\AppServiceProvider;
use Illuminate\Broadcasting\BroadcastServiceProvider;

return [
    Illuminate\Broadcasting\BroadcastServiceProvider::class,
    App\Providers\Arkzen\ArkzenServiceProvider::class,
    AppServiceProvider::class,
];
