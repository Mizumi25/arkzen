<?php

// ============================================================
// ARKZEN GENERATED BROADCAST EVENT — MessageSent
// Tatemono: broadcast-test
// Channel: broadcast-test-public (public)
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-09T15:14:20.517415Z
// ============================================================

namespace App\Events\Arkzen\BroadcastTest\Broadcast;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Broadcasting\Channel;

class MessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly array $data = []
    ) {}

    public function broadcastOn(): array
    {
        return [new Channel('broadcast-test-public')];
    }

    public function broadcastAs(): string
    {
        // Scoped event name: tatemono.event-name
        return 'broadcast-test.message-sent';
    }

    public function broadcastWith(): array
    {
        return $this->data;
    }
}
