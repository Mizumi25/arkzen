<?php

// ============================================================
// ARKZEN GENERATED MAILABLE — OrderConfirmationMail
// Tatemono: mail-test
// Subject: Your order has been confirmed
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-16T08:36:06.750125Z
// ============================================================

namespace App\Mail\Arkzen\MailTest;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrderConfirmationMail extends Mailable
{
    use Queueable, SerializesModels;

    public readonly string $order_id;
    public readonly string $total;
    public readonly string $customer_name;

    public function __construct(string $order_id, string $total, string $customer_name)
    {
        $this->order_id = $order_id;
        $this->total = $total;
        $this->customer_name = $customer_name;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your order has been confirmed',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.arkzen.mail-test.order-confirmation',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
