<?php

// ============================================================
// ARKZEN GENERATED LISTENER — SendOrderConfirmation
// Tatemono: events-test
// Listens to: App\Events\Arkzen\EventsTest\OrderPlaced
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-26T13:09:47.170363Z
// ============================================================

namespace App\Listeners\Arkzen\EventsTest;

use App\Events\Arkzen\EventsTest\OrderPlaced;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;
use \App\Models\Arkzen\EventsTest\EventLog;

class SendOrderConfirmation implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(OrderPlaced $event): void
    {
        $start = microtime(true);
        
        \App\Models\Arkzen\EventsTest\EventLog::create([
            'event_name'    => class_basename($event),
            'listener_name' => class_basename($this),
            'status'        => 'completed',
            'payload'       => json_encode($event->data),
            'duration_ms'   => (int) ((microtime(true) - $start) * 1000),
        ]);
    }
}
