<?php

// ============================================================
// ARKZEN GENERATED NOTIFICATION — SummaryNotification
// Tatemono: body-mail-notification
// Channels: mail, database
// Broadcast channel type: private
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-22T05:16:07.115646Z
// ============================================================

namespace App\Notifications\Arkzen\BodyMailNotification;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

class SummaryNotification extends Notification implements ShouldQueue
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
            ->subject('📊 Activity Summary — toMail_body injection test')
            ->greeting('Hi there!')
            ->line($this->message ?? 'Here is your latest activity summary.')
            ->line('Notifications: 2 unread | Mails: 3 sent | Status: All healthy')
            ->action('View Dashboard', url('/'))
            ->salutation('Cheers, Arkzen Engine');
    }

    public function toArray(object $notifiable): array
    {
        return array_merge([
            'type'     => 'BodyMailNotification\\SummaryNotification',
            'message'  => 'Here is your activity summary.',
            'tatemono' => 'body-mail-notification',
        ], $this->data);
    }
}
