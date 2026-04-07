<?php

// ============================================================
// ARKZEN GENERATED LISTENER — SendWelcomeEmail
// Tatemono: events-test
// Listens to: App\Events\Arkzen\EventsTest\UserSignedUp
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-07T00:08:30.105283Z
// ============================================================

namespace App\Listeners\Arkzen\EventsTest;

use App\Events\Arkzen\EventsTest\UserSignedUp;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class SendWelcomeEmail implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(UserSignedUp $event): void
    {
        Log::info('[Arkzen Listener] EventsTest\\SendWelcomeEmail fired', $event->data);

        // TODO: implement listener logic
    }
}
