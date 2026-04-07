<?php

// ============================================================
// ARKZEN GENERATED MAILABLE — WelcomeMail
// Tatemono: mail-test
// Subject: Welcome to Arkzen
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-07T00:08:30.862381Z
// ============================================================

namespace App\Mail\Arkzen\MailTest;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WelcomeMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $username,
        public readonly string $app_name
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Welcome to Arkzen',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'arkzen.mail-test.welcome-mail',
            with: [
            'username' => $this->username,
            'app_name' => $this->app_name,
        ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
