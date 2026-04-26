<?php

// ============================================================
// ARKZEN GENERATED COMMAND — SyncDataCommand
// Tatemono: scheduler-test
// Signature: scheduler-test:sync-data
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-26T02:50:43.880798Z
// ============================================================

namespace App\Console\Commands\Arkzen\SchedulerTest;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncDataCommand extends Command
{
    protected $signature   = 'scheduler-test:sync-data';
    protected $description = 'Syncs data from external source';

    public function handle(): int
    {
        $start = microtime(true);
            $this->info('[Arkzen:scheduler-test] Syncing data...');
        
            \App\Models\Arkzen\SchedulerTest\CommandRun::create([
                'command_name' => 'sync-data',
                'signature'    => 'scheduler-test:sync-data',
                'exit_code'    => 0,
                'output'       => 'Data synced successfully.',
                'triggered_by' => 'schedule',
                'duration_ms'  => (int) ((microtime(true) - $start) * 1000),
            ]);
        
            $this->info('[Arkzen:scheduler-test] ✓ Done');
            return Command::SUCCESS;
    }
}
