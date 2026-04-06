<?php

// ============================================================
// ARKZEN GENERATED MAILABLE — StartMail
// Tatemono: mail-test
// Subject: StartMail
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-06T23:20:47.013767Z
// ============================================================

namespace App\Mail\Arkzen\MailTest;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class StartMail extends Mailable
{
    use Queueable, SerializesModels;



    public function __construct()
    {

    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'StartMail',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.arkzen.mail-test.start',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
