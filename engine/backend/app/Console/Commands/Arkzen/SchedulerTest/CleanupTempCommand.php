<?php

// ============================================================
// ARKZEN GENERATED COMMAND — CleanupTempCommand
// Tatemono: scheduler-test
// Signature: scheduler-test:cleanup-temp
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-07T00:08:31.478969Z
// ============================================================

namespace App\Console\Commands\Arkzen\SchedulerTest;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CleanupTempCommand extends Command
{
    protected $signature   = 'scheduler-test:cleanup-temp';
    protected $description = 'Arkzen [scheduler-test] command: cleanup-temp';

    public function handle(): int
    {
        $this->info('[Arkzen:scheduler-test] Running: scheduler-test:cleanup-temp');
        Log::info('[Arkzen Command] SchedulerTest\\CleanupTempCommand started');

        // // No schedule defined
        // TODO: implement command logic

        $this->info('[Arkzen:scheduler-test] ✓ Done');
        return Command::SUCCESS;
    }
}
