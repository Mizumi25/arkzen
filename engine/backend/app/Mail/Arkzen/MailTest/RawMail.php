<?php

// ============================================================
// ARKZEN GENERATED MAILABLE — RawMail
// Tatemono: mail-test
// Subject: RawMail
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-06T23:20:47.012157Z
// ============================================================

namespace App\Mail\Arkzen\MailTest;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RawMail extends Mailable
{
    use Queueable, SerializesModels;



    public function __construct()
    {

    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'RawMail',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.arkzen.mail-test.raw',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
