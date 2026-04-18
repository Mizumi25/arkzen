<?php

// ============================================================
// ARKZEN GENERATED NOTIFICATION — BroadcastPingNotification
// Tatemono: notification-test
// Channels: broadcast, database
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-18T13:01:16.722004Z
// ============================================================

namespace App\Notifications\Arkzen\NotificationTest;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

class BroadcastPingNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly array $data = []
    ) {}

    public function via(object $notifiable): array
    {
        return ['broadcast', 'database'];
    }

    public function toBroadcast(object $notifiable): array
    {
        return [
            'message' => 'Real-time notification received!',
            'data'    => $this->data,
        ];
    }

    public function broadcastOn(): array
    {
        return [new \Illuminate\Broadcasting\PrivateChannel('private-notification-test.' . $this->notifiable->id)];
    }

    public function broadcastAs(): string
    {
        return 'notification-test.notification';
    }

    public function toArray(object $notifiable): array
    {
        return array_merge([
            'type'     => 'NotificationTest\\BroadcastPingNotification',
            'message'  => 'Real-time notification received!',
            'tatemono' => 'notification-test',
        ], $this->data);
    }
}
