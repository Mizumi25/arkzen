<?php

// ============================================================
// ARKZEN GENERATED MAILABLE — PasswordResetMail
// Tatemono: mail-test
// Subject: Reset your password
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-20T08:34:02.029759Z
// ============================================================

namespace App\Mail\Arkzen\MailTest;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public readonly string $reset_link;
    public readonly string $expires_in;

    public function __construct(string $reset_link, string $expires_in)
    {
        $this->reset_link = $reset_link;
        $this->expires_in = $expires_in;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Reset your password',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.arkzen.mail-test.password-reset',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
