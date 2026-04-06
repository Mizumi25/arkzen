<?php

// ============================================================
// ARKZEN GENERATED COMMAND — EndCommand
// Tatemono: scheduler-test
// Signature: scheduler-test:end
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-06T23:20:47.679259Z
// ============================================================

namespace App\Console\Commands\Arkzen\SchedulerTest;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class EndCommand extends Command
{
    protected $signature   = 'scheduler-test:end';
    protected $description = 'Arkzen [scheduler-test] command: end';

    public function handle(): int
    {
        $this->info('[Arkzen:scheduler-test] Running: scheduler-test:end');
        Log::info('[Arkzen Command] SchedulerTest\\EndCommand started');

        // // No schedule defined
        // TODO: implement command logic

        $this->info('[Arkzen:scheduler-test] ✓ Done');
        return Command::SUCCESS;
    }
}
