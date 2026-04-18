<?php

// ============================================================
// ARKZEN GENERATED NOTIFICATION — SubjectNotification
// Tatemono: notification-test
// Channels: database
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-17T15:05:55.888884Z
// ============================================================

namespace App\Notifications\Arkzen\NotificationTest;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

class SubjectNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly array $data = []
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }



    public function toArray(object $notifiable): array
    {
        return array_merge([
            'type'     => 'NotificationTest\\SubjectNotification',
            'message'  => 'You have a new notification.',
            'tatemono' => 'notification-test',
        ], $this->data);
    }
}
