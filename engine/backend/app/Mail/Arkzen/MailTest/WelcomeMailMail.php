<?php

// ============================================================
// ARKZEN GENERATED MAILABLE — WelcomeMailMail
// Tatemono: mail-test
// Subject: Welcome to Arkzen
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-21T00:07:23.957141Z
// ============================================================

namespace App\Mail\Arkzen\MailTest;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WelcomeMailMail extends Mailable
{
    use Queueable, SerializesModels;

    public readonly string $username;
    public readonly string $app_name;

    public function __construct(string $username, string $app_name)
    {
        $this->username = $username;
        $this->app_name = $app_name;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Welcome to Arkzen',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.arkzen.mail-test.welcome-mail',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
