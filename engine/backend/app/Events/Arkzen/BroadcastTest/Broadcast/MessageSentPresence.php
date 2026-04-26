<?php

// ============================================================
// ARKZEN GENERATED BROADCAST EVENT — MessageSentPresence
// Tatemono: broadcast-test
// Channel: broadcast-test-presence (presence)
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-26T13:23:43.666567Z
// ============================================================

namespace App\Events\Arkzen\BroadcastTest\Broadcast;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Broadcasting\PresenceChannel;

class MessageSentPresence implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly array $data = []
    ) {}

    public function broadcastOn(): array
    {
        return [new PresenceChannel('broadcast-test-presence')];
    }

    public function broadcastAs(): string
    {
        return 'broadcast-test.message-sent-presence';
    }

    public function broadcastWith(): array
    {
        return $this->data;
    }
}
