<?php

// ============================================================
// ARKZEN GENERATED BROADCAST EVENT — MessageSentPublic
// Tatemono: broadcast-test
// Channel: broadcast-test-public (public)
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-21T07:14:58.117715Z
// ============================================================

namespace App\Events\Arkzen\BroadcastTest\Broadcast;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Broadcasting\Channel;

class MessageSentPublic implements ShouldBroadcast
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
        return 'broadcast-test.message-sent-public';
    }

    public function broadcastWith(): array
    {
        return $this->data;
    }
}
