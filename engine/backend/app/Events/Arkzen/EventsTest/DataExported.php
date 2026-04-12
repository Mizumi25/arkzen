<?php

// ============================================================
// ARKZEN GENERATED EVENT — DataExported
// Tatemono: events-test
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-12T04:27:32.447486Z
// ============================================================

namespace App\Events\Arkzen\EventsTest;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DataExported
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly array $data = []
    ) {}
}
