<?php

// ============================================================
// ARKZEN GENERATED LISTENER — CleanupTempFiles
// Tatemono: events-test
// Listens to: App\Events\Arkzen\EventsTest\DataExported
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-09T07:54:26.025224Z
// ============================================================

namespace App\Listeners\Arkzen\EventsTest;

use App\Events\Arkzen\EventsTest\DataExported;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class CleanupTempFiles implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(DataExported $event): void
    {
        Log::info('[Arkzen Listener] EventsTest\\CleanupTempFiles fired', $event->data);

        // TODO: implement listener logic
    }
}
