<?php

// ============================================================
// ARKZEN GENERATED MAILABLE — AlertMail
// Tatemono: body-mail-notification
// Subject: ⚠ Action Required — blade_body injection test
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-21T07:14:57.840082Z
// ============================================================

namespace App\Mail\Arkzen\BodyMailNotification;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AlertMail extends Mailable
{
    use Queueable, SerializesModels;

    public readonly string $alert_message;
    public readonly string $action_url;

    public function __construct(string $alert_message = '', string $action_url = '')
    {
        $this->alert_message = $alert_message;
        $this->action_url = $action_url;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '⚠ Action Required — blade_body injection test',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.arkzen.body-mail-notification.alert',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
