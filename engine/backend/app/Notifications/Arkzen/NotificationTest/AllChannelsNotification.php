<?php

// ============================================================
// ARKZEN GENERATED NOTIFICATION — AllChannelsNotification
// Tatemono: notification-test
// Channels: database, mail, broadcast
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-19T01:25:35.993420Z
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
        return ['database', 'mail', 'broadcast'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('All Channels Test')
            ->line('This notification was sent to all three channels simultaneously')
            ->action('View', url('/'))
            ->line('Thank you for using our application.');
    }

    public function toBroadcast(object $notifiable): array
    {
        return [
            'message' => 'This notification was sent to all three channels simultaneously',
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
            'type'     => 'NotificationTest\\AllChannelsNotification',
            'message'  => 'This notification was sent to all three channels simultaneously',
            'tatemono' => 'notification-test',
        ], $this->data);
    }
}
