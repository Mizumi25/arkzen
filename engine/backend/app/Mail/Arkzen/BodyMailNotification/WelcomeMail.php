<?php

// ============================================================
// ARKZEN GENERATED MAILABLE — WelcomeMail
// Tatemono: body-mail-notification
// Subject: Welcome to Arkzen — blade_body injection test
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-23T15:35:33.806864Z
// ============================================================

namespace App\Mail\Arkzen\BodyMailNotification;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WelcomeMail extends Mailable
{
    use Queueable, SerializesModels;

    public readonly string $name;
    public readonly string $app_name;

    public function __construct(string $name = '', string $app_name = '')
    {
        $this->name = $name;
        $this->app_name = $app_name;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Welcome to Arkzen — blade_body injection test',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.arkzen.body-mail-notification.welcome',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
