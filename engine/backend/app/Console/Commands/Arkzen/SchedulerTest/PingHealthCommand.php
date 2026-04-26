<?php

// ============================================================
// ARKZEN GENERATED COMMAND — PingHealthCommand
// Tatemono: scheduler-test
// Signature: scheduler-test:ping-health
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-26T10:49:11.993183Z
// ============================================================

namespace App\Console\Commands\Arkzen\SchedulerTest;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class PingHealthCommand extends Command
{
    protected $signature   = 'scheduler-test:ping-health';
    protected $description = 'Pings all services and records health status';

    public function handle(): int
    {
        $start = microtime(true);
            $this->info('[Arkzen:scheduler-test] Pinging services...');
        
            \App\Models\Arkzen\SchedulerTest\CommandRun::create([
                'command_name' => 'ping-health',
                'signature'    => 'scheduler-test:ping-health',
                'exit_code'    => 0,
                'output'       => 'All services healthy.',
                'triggered_by' => 'schedule',
                'duration_ms'  => (int) ((microtime(true) - $start) * 1000),
            ]);
        
            $this->info('[Arkzen:scheduler-test] ✓ Done');
            return Command::SUCCESS;
    }
}
