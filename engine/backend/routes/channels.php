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

// Module: auth-test
Broadcast::channel('private-auth-test.{userId}', function ($user, $userId = null) {
    return (int) $user->id === (int) $userId;
});

// Module: mail-test
Broadcast::channel('private-mail-test.{userId}', function ($user, $userId = null) {
    return (int) $user->id === (int) $userId;
});

// Module: notification-test
Broadcast::channel('private-notification-test.{userId}', function ($user, $userId = null) {
    return (int) $user->id === (int) $userId;
});

// Module: roles-test
Broadcast::channel('private-roles-test.{userId}', function ($user, $userId = null) {
    return (int) $user->id === (int) $userId;
});

// Module: flower-shop
Broadcast::channel('private-flower-shop.{userId}', function ($user, $userId = null) {
    return (int) $user->id === (int) $userId;
});
