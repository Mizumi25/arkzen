<?php

// ============================================================
// ARKZEN GENERATED NOTIFICATION — DatabasePing
// Tatemono: notification-test
// Channels: 'database'
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-07T00:08:31.067364Z
// ============================================================

namespace App\Notifications\Arkzen\NotificationTest;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class DatabasePing extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly array $data = []
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'message' => 'You have a new database notification',
            'data'    => $this->data,
        ];
    }

    public function toArray(object $notifiable): array
    {
        return $this->data;
    }
}
