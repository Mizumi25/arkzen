<?php

use Illuminate\Support\Facades\Broadcast;

// ============================================================
// ARKZEN GENERATED CHANNEL AUTHORIZATIONS
// DO NOT EDIT DIRECTLY. Arkzen manages this file.
// ============================================================


// Module: broadcast-test
Broadcast::channel('broadcast-test-public', function () {
    return true;
});

// Module: broadcast-test
Broadcast::channel('broadcast-test-presence', function ($user, $id = null) {
    if (!$user) return false;
    return ['id' => $user->id, 'name' => $user->name];
});

// Module: notification-test
Broadcast::channel('notification-test.{id}', function ($user, $id = null) {
    return (int) $user->id === (int) $id;
});

// Module: notification-test
Broadcast::channel('notification-test.notifications', function () {
    return true;
});
