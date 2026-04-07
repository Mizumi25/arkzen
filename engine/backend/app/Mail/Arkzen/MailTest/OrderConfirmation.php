<?php

// ============================================================
// ARKZEN GENERATED MAILABLE — OrderConfirmation
// Tatemono: mail-test
// Subject: Your order has been confirmed
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-07T00:08:30.863146Z
// ============================================================

namespace App\Mail\Arkzen\MailTest;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrderConfirmation extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $order_id,
        public readonly string $total,
        public readonly string $customer_name
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your order has been confirmed',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'arkzen.mail-test.order-confirmation',
            with: [
            'order_id' => $this->order_id,
            'total' => $this->total,
            'customer_name' => $this->customer_name,
        ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
