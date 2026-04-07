<?php

// ============================================================
// ARKZEN GENERATED NOTIFICATION — MailPing
// Tatemono: notification-test
// Channels: 'mail'
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-07T00:08:31.068074Z
// ============================================================

namespace App\Notifications\Arkzen\NotificationTest;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class MailPing extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly array $data = []
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): \Illuminate\Notifications\Messages\MailMessage
    {
        return (new \Illuminate\Notifications\Messages\MailMessage)
            ->subject('Mail Ping from Arkzen')
            ->line('This is a test mail notification')
            ->line('Thank you for using Arkzen!');
    }

    public function toArray(object $notifiable): array
    {
        return $this->data;
    }
}
