<?php

// ============================================================
// ARKZEN GENERATED NOTIFICATION — AllChannelsNotification
// Tatemono: notification-test
// Channels: database, mail, broadcast
// Broadcast channel type: private
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-21T03:52:55.628310Z
// ============================================================

namespace App\Notifications\Arkzen\NotificationTest;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Broadcasting\PrivateChannel;

class AllChannelsNotification extends Notification implements ShouldQueue
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
        return [new PrivateChannel('notification-test.' . $this->notifiable->id)];
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
