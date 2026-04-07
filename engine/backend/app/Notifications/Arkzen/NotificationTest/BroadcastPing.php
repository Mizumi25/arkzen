<?php

// ============================================================
// ARKZEN GENERATED NOTIFICATION — BroadcastPing
// Tatemono: notification-test
// Channels: 'broadcast', 'database'
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-07T00:08:31.068590Z
// ============================================================

namespace App\Notifications\Arkzen\NotificationTest;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class BroadcastPing extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly array $data = []
    ) {}

    public function via(object $notifiable): array
    {
        return ['broadcast', 'database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'message' => 'Real-time notification received!',
            'data'    => $this->data,
        ];
    }

    public function toBroadcast(object $notifiable): \Illuminate\Notifications\Messages\BroadcastMessage
    {
        return new \Illuminate\Notifications\Messages\BroadcastMessage([
            'message' => 'Real-time notification received!',
            'data'    => $this->data,
        ]);
    }

    public function toArray(object $notifiable): array
    {
        return $this->data;
    }
}
