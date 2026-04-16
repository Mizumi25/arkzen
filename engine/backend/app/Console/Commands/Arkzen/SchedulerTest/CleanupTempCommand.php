<?php

// ============================================================
// ARKZEN GENERATED COMMAND — CleanupTempCommand
// Tatemono: scheduler-test
// Signature: scheduler-test:cleanup-temp
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-16T08:36:07.416675Z
// ============================================================

namespace App\Console\Commands\Arkzen\SchedulerTest;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CleanupTempCommand extends Command
{
    protected $signature   = 'scheduler-test:cleanup-temp';
    protected $description = 'Deletes temporary files older than 24h';

    public function handle(): int
    {
        $start = microtime(true);
            $this->info('[Arkzen:scheduler-test] Running cleanup-temp...');
        
            \App\Models\Arkzen\SchedulerTest\CommandRun::create([
                'command_name' => 'cleanup-temp',
                'signature'    => 'scheduler-test:cleanup-temp',
                'exit_code'    => 0,
                'output'       => 'Cleanup completed successfully.',
                'triggered_by' => 'schedule',
                'duration_ms'  => (int) ((microtime(true) - $start) * 1000),
            ]);
        
            $this->info('[Arkzen:scheduler-test] ✓ Done');
            return Command::SUCCESS;
    }
}
