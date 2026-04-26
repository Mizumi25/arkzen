<?php

// ============================================================
// ARKZEN GENERATED BROADCAST EVENT — MessageSentPrivate
// Tatemono: broadcast-test
// Channel: broadcast-test.{id} (private)
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-26T13:23:43.666095Z
// ============================================================

namespace App\Events\Arkzen\BroadcastTest\Broadcast;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Broadcasting\PrivateChannel;

class MessageSentPrivate implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly ?int $userId = null,
        public readonly array $data = []
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('broadcast-test.' . $this->userId)];
    }

    public function broadcastAs(): string
    {
        return 'broadcast-test.message-sent-private';
    }

    public function broadcastWith(): array
    {
        return $this->data;
    }
}
