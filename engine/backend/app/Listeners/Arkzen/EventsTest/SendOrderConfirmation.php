<?php

// ============================================================
// ARKZEN GENERATED LISTENER — SendOrderConfirmation
// Tatemono: events-test
// Listens to: App\Events\Arkzen\EventsTest\OrderPlaced
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-09T07:54:26.021757Z
// ============================================================

namespace App\Listeners\Arkzen\EventsTest;

use App\Events\Arkzen\EventsTest\OrderPlaced;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class SendOrderConfirmation implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(OrderPlaced $event): void
    {
        Log::info('[Arkzen Listener] EventsTest\\SendOrderConfirmation fired', $event->data);

        // TODO: implement listener logic
    }
}
