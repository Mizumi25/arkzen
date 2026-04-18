<?php

// ============================================================
// ARKZEN GENERATED NOTIFICATION — BroadcastPingNotification
// Tatemono: notification-test
// Channels: [broadcast, database]
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-17T15:05:55.885310Z
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
        return ['[broadcast', 'database]'];
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
