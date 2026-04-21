<?php

// ============================================================
// ARKZEN GENERATED LISTENER — LogExportActivity
// Tatemono: events-test
// Listens to: App\Events\Arkzen\EventsTest\DataExported
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-21T13:32:16.855689Z
// ============================================================

namespace App\Listeners\Arkzen\EventsTest;

use App\Events\Arkzen\EventsTest\DataExported;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;
use \App\Models\Arkzen\EventsTest\EventLog;

class LogExportActivity implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(DataExported $event): void
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
