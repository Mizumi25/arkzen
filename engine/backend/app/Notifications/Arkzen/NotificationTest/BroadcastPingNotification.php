<?php

// ============================================================
// ARKZEN GENERATED NOTIFICATION — BroadcastPingNotification
// Tatemono: notification-test
// Channels: broadcast, database
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-19T13:33:42.878308Z
// ============================================================

namespace App\Notifications\Arkzen\NotificationTest;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

class BroadcastPingNotification extends Notification implements ShouldQueue
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
            'message' => 'Real-time notification received!',
            'data'    => $this->data,
        ];
    }

    public function broadcastOn(): array
    {
        return [new \Illuminate\Broadcasting\PrivateChannel('notification-test.' . $this->notifiable->id)];
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
