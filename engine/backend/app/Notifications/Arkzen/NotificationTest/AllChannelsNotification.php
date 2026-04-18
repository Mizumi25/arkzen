<?php

// ============================================================
// ARKZEN GENERATED NOTIFICATION — AllChannelsNotification
// Tatemono: notification-test
// Channels: [database, mail, broadcast]
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-17T15:05:55.885980Z
// ============================================================

namespace App\Notifications\Arkzen\NotificationTest;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

class AllChannelsNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly array $data = []
    ) {}

    public function via(object $notifiable): array
    {
        return ['[database', 'mail', 'broadcast]'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('All Channels Test')
            ->line('This notification was sent to all three channels simultaneously')
            ->action('View', url('/'))
            ->line('Thank you for using our application.');
    }

    public function toArray(object $notifiable): array
    {
        return array_merge([
            'type'     => 'NotificationTest\\AllChannelsNotification',
            'message'  => 'This notification was sent to all three channels simultaneously',
            'tatemono' => 'notification-test',
        ], $this->data);
    }
}
