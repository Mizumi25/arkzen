<?php

// ============================================================
// ARKZEN GENERATED COMMAND — SyncDataCommand
// Tatemono: scheduler-test
// Signature: scheduler-test:sync-data
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-07T00:08:31.480507Z
// ============================================================

namespace App\Console\Commands\Arkzen\SchedulerTest;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncDataCommand extends Command
{
    protected $signature   = 'scheduler-test:sync-data';
    protected $description = 'Arkzen [scheduler-test] command: sync-data';

    public function handle(): int
    {
        $this->info('[Arkzen:scheduler-test] Running: scheduler-test:sync-data');
        Log::info('[Arkzen Command] SchedulerTest\\SyncDataCommand started');

        // // No schedule defined
        // TODO: implement command logic

        $this->info('[Arkzen:scheduler-test] ✓ Done');
        return Command::SUCCESS;
    }
}
