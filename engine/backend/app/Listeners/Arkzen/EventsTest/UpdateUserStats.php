<?php

// ============================================================
// ARKZEN GENERATED LISTENER — UpdateUserStats
// Tatemono: events-test
// Listens to: App\Events\Arkzen\EventsTest\UserSignedUp
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-18T12:12:36.821832Z
// ============================================================

namespace App\Listeners\Arkzen\EventsTest;

use App\Events\Arkzen\EventsTest\UserSignedUp;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;
use \App\Models\Arkzen\EventsTest\EventLog;

class UpdateUserStats implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(UserSignedUp $event): void
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
