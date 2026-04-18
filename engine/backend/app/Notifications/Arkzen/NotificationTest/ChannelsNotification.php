<?php

// ============================================================
// ARKZEN GENERATED NOTIFICATION — ChannelsNotification
// Tatemono: notification-test
// Channels: database
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-17T15:05:55.886568Z
// ============================================================

namespace App\Notifications\Arkzen\NotificationTest;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

class ChannelsNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly array $data = []
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }



    public function toArray(object $notifiable): array
    {
        return array_merge([
            'type'     => 'NotificationTest\\ChannelsNotification',
            'message'  => 'You have a new notification.',
            'tatemono' => 'notification-test',
        ], $this->data);
    }
}
