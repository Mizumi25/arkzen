<?php

// ============================================================
// ARKZEN GENERATED COMMAND — ScheduleCommand
// Tatemono: scheduler-test
// Signature: scheduler-test:schedule
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-07T00:08:31.478401Z
// ============================================================

namespace App\Console\Commands\Arkzen\SchedulerTest;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ScheduleCommand extends Command
{
    protected $signature   = 'scheduler-test:schedule';
    protected $description = 'Arkzen [scheduler-test] command: schedule';

    public function handle(): int
    {
        $this->info('[Arkzen:scheduler-test] Running: scheduler-test:schedule');
        Log::info('[Arkzen Command] SchedulerTest\\ScheduleCommand started');

        // // No schedule defined
        // TODO: implement command logic

        $this->info('[Arkzen:scheduler-test] ✓ Done');
        return Command::SUCCESS;
    }
}
