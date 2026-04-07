<?php

// ============================================================
// ARKZEN GENERATED NOTIFICATION — AllChannels
// Tatemono: notification-test
// Channels: 'database', 'mail', 'broadcast'
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-07T00:08:31.069078Z
// ============================================================

namespace App\Notifications\Arkzen\NotificationTest;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class AllChannels extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly array $data = []
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail', 'broadcast'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'message' => 'This notification was sent to all three channels simultaneously',
            'data'    => $this->data,
        ];
    }

    public function toMail(object $notifiable): \Illuminate\Notifications\Messages\MailMessage
    {
        return (new \Illuminate\Notifications\Messages\MailMessage)
            ->subject('All Channels Test')
            ->line('This notification was sent to all three channels simultaneously')
            ->line('Thank you for using Arkzen!');
    }

    public function toBroadcast(object $notifiable): \Illuminate\Notifications\Messages\BroadcastMessage
    {
        return new \Illuminate\Notifications\Messages\BroadcastMessage([
            'message' => 'This notification was sent to all three channels simultaneously',
            'data'    => $this->data,
        ]);
    }

    public function toArray(object $notifiable): array
    {
        return $this->data;
    }
}
