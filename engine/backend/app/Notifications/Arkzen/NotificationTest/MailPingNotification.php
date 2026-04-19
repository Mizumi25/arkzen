<?php

// ============================================================
// ARKZEN GENERATED NOTIFICATION — MailPingNotification
// Tatemono: notification-test
// Channels: mail
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-19T07:18:56.459397Z
// ============================================================

namespace App\Notifications\Arkzen\NotificationTest;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

class MailPingNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * The notifiable entity (user).
     *
     * @var object
     */
    public $notifiable;

    public function __construct(
        public readonly array $data = []
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Mail Ping from Arkzen')
            ->line('This is a test mail notification')
            ->action('View', url('/'))
            ->line('Thank you for using our application.');
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
