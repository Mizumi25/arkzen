<?php

// ============================================================
// ARKZEN GENERATED NOTIFICATION — ActionRequiredNotification
// Tatemono: body-mail-notification
// Channels: mail, database
// Broadcast channel type: private
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-21T03:52:53.444021Z
// ============================================================

namespace App\Notifications\Arkzen\BodyMailNotification;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

class ActionRequiredNotification extends Notification implements ShouldQueue
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
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new \Illuminate\Notifications\Messages\MailMessage)
            ->subject('⚠ Action Required — toMail_body injection test')
            ->greeting('Hello!')
            ->line($this->message ?? 'You have a pending action that requires your attention.')
            ->line('This toMail() body was injected via the Arkzen DSL — not a stub.')
            ->action('Review Now', url('/'))
            ->line('NotificationBuilder v3.9 toMail_body injection confirmed ✓');
    }

    public function toArray(object $notifiable): array
    {
        return array_merge([
            'type'     => 'BodyMailNotification\\ActionRequiredNotification',
            'message'  => 'You have a pending action that requires your attention.',
            'tatemono' => 'body-mail-notification',
        ], $this->data);
    }
}
