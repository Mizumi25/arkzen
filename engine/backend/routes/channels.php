<?php

use Illuminate\Support\Facades\Broadcast;

// ============================================================
// ARKZEN GENERATED CHANNEL AUTHORIZATIONS
// DO NOT EDIT DIRECTLY. Arkzen manages this file.
// ============================================================


// Module: broadcast-test
Broadcast::channel('broadcast-test-public', function ($user) {
    return $user !== null;
});
