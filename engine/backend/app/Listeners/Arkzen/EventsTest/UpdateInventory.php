<?php

// ============================================================
// ARKZEN GENERATED LISTENER — UpdateInventory
// Tatemono: events-test
// Listens to: App\Events\Arkzen\EventsTest\OrderPlaced
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-07T00:08:30.103528Z
// ============================================================

namespace App\Listeners\Arkzen\EventsTest;

use App\Events\Arkzen\EventsTest\OrderPlaced;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class UpdateInventory implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(OrderPlaced $event): void
    {
        Log::info('[Arkzen Listener] EventsTest\\UpdateInventory fired', $event->data);

        // TODO: implement listener logic
    }
}
