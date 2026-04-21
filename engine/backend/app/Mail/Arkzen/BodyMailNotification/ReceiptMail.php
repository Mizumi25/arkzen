<?php

// ============================================================
// ARKZEN GENERATED MAILABLE — ReceiptMail
// Tatemono: body-mail-notification
// Subject: Your receipt — blade_body injection test
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-21T11:47:45.035888Z
// ============================================================

namespace App\Mail\Arkzen\BodyMailNotification;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ReceiptMail extends Mailable
{
    use Queueable, SerializesModels;

    public readonly string $order_id;
    public readonly string $amount;
    public readonly string $item_name;

    public function __construct(string $order_id = '', string $amount = '', string $item_name = '')
    {
        $this->order_id = $order_id;
        $this->amount = $amount;
        $this->item_name = $item_name;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your receipt — blade_body injection test',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.arkzen.body-mail-notification.receipt',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
