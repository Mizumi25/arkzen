<?php

// ============================================================
// ARKZEN GENERATED NOTIFICATION — BroadcastPingPublicNotification
// Tatemono: notification-test
// Channels: broadcast, database
// Broadcast channel type: public
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-21T03:52:55.627979Z
// ============================================================

namespace App\Notifications\Arkzen\NotificationTest;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Broadcasting\Channel;

class BroadcastPingPublicNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * The notifiable entity (user).
     *
     * @var object
     */
    public $notifiable;

    /**
     * Additional data for the notification.
     *
     * @var array
     */
    public array $data;

    /**
     * Create a new notification instance.
     */
    public function __construct(object $notifiable, array $data = [])
    {
        $this->notifiable = $notifiable;
        $this->data       = $data;
    }

    public function via(object $notifiable): array
    {
        return ['broadcast', 'database'];
    }

    public function toBroadcast(object $notifiable): array
    {
        return [
            'message' => 'This broadcast went to the public notification channel!',
            'data'    => $this->data,
        ];
    }

    public function broadcastOn(): array
    {
        return [new Channel('notification-test.notifications')];
    }

    public function broadcastAs(): string
    {
        return 'notification-test.notification';
    }

    public function toArray(object $notifiable): array
    {
        return array_merge([
            'type'     => 'NotificationTest\\BroadcastPingPublicNotification',
            'message'  => 'This broadcast went to the public notification channel!',
            'tatemono' => 'notification-test',
        ], $this->data);
    }
}
