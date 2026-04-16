<?php

// ============================================================
// ARKZEN GENERATED EVENT — UserSignedUp
// Tatemono: events-test
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-16T12:42:31.578895Z
// ============================================================

namespace App\Events\Arkzen\EventsTest;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserSignedUp
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly array $data = []
    ) {}
}
