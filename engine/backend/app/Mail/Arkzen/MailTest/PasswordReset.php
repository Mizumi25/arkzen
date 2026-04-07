<?php

// ============================================================
// ARKZEN GENERATED MAILABLE — PasswordReset
// Tatemono: mail-test
// Subject: Reset your password
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-07T00:08:30.863615Z
// ============================================================

namespace App\Mail\Arkzen\MailTest;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordReset extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $reset_link,
        public readonly string $expires_in
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Reset your password',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'arkzen.mail-test.password-reset',
            with: [
            'reset_link' => $this->reset_link,
            'expires_in' => $this->expires_in,
        ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
