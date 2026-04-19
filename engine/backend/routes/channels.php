<?php

use Illuminate\Support\Facades\Broadcast;

// ============================================================
// ARKZEN GENERATED CHANNEL AUTHORIZATIONS
// DO NOT EDIT DIRECTLY. Arkzen manages this file.
// ============================================================


// Module: auth-test
Broadcast::channel('auth-test.{id}', function ($user, $id = null) {
    return (int) $user->id === (int) $id;
});

// Module: mail-test
Broadcast::channel('mail-test.{id}', function ($user, $id = null) {
    return (int) $user->id === (int) $id;
});

// Module: notification-test
Broadcast::channel('notification-test.{id}', function ($user, $id = null) {
    return (int) $user->id === (int) $id;
});

// Module: roles-test
Broadcast::channel('roles-test.{id}', function ($user, $id = null) {
    return (int) $user->id === (int) $id;
});

// Module: notification-test
Broadcast::channel('notification-test.notifications', function () {
    return true;
});
