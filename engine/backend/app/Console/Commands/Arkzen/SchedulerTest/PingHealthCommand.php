<?php

// ============================================================
// ARKZEN GENERATED COMMAND — PingHealthCommand
// Tatemono: scheduler-test
// Signature: scheduler-test:ping-health
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-07T00:08:31.480012Z
// ============================================================

namespace App\Console\Commands\Arkzen\SchedulerTest;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class PingHealthCommand extends Command
{
    protected $signature   = 'scheduler-test:ping-health';
    protected $description = 'Arkzen [scheduler-test] command: ping-health';

    public function handle(): int
    {
        $this->info('[Arkzen:scheduler-test] Running: scheduler-test:ping-health');
        Log::info('[Arkzen Command] SchedulerTest\\PingHealthCommand started');

        // // No schedule defined
        // TODO: implement command logic

        $this->info('[Arkzen:scheduler-test] ✓ Done');
        return Command::SUCCESS;
    }
}
