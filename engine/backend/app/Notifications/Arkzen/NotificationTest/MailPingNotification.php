<?php

// ============================================================
// ARKZEN GENERATED NOTIFICATION — MailPingNotification
// Tatemono: notification-test
// Channels: [mail]
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-17T15:05:55.884621Z
// ============================================================

namespace App\Notifications\Arkzen\NotificationTest;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

class MailPingNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly array $data = []
    ) {}

    public function via(object $notifiable): array
    {
        return ['[mail]'];
    }



    public function toArray(object $notifiable): array
    {
        return array_merge([
            'type'     => 'NotificationTest\\MailPingNotification',
            'message'  => 'This is a test mail notification',
            'tatemono' => 'notification-test',
        ], $this->data);
    }
}
