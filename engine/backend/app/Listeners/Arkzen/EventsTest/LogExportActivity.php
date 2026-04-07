<?php

// ============================================================
// ARKZEN GENERATED LISTENER — LogExportActivity
// Tatemono: events-test
// Listens to: App\Events\Arkzen\EventsTest\DataExported
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-07T00:08:30.107487Z
// ============================================================

namespace App\Listeners\Arkzen\EventsTest;

use App\Events\Arkzen\EventsTest\DataExported;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class LogExportActivity implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(DataExported $event): void
    {
        Log::info('[Arkzen Listener] EventsTest\\LogExportActivity fired', $event->data);

        // TODO: implement listener logic
    }
}
