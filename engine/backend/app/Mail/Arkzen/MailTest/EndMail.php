<?php

// ============================================================
// ARKZEN GENERATED MAILABLE — EndMail
// Tatemono: mail-test
// Subject: EndMail
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-06T23:20:47.017763Z
// ============================================================

namespace App\Mail\Arkzen\MailTest;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EndMail extends Mailable
{
    use Queueable, SerializesModels;



    public function __construct()
    {

    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'EndMail',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.arkzen.mail-test.end',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
