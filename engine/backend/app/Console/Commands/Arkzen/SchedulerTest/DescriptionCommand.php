<?php

// ============================================================
// ARKZEN GENERATED COMMAND — DescriptionCommand
// Tatemono: scheduler-test
// Signature: scheduler-test:description
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-07T00:08:31.477803Z
// ============================================================

namespace App\Console\Commands\Arkzen\SchedulerTest;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class DescriptionCommand extends Command
{
    protected $signature   = 'scheduler-test:description';
    protected $description = 'Arkzen [scheduler-test] command: description';

    public function handle(): int
    {
        $this->info('[Arkzen:scheduler-test] Running: scheduler-test:description');
        Log::info('[Arkzen Command] SchedulerTest\\DescriptionCommand started');

        // // No schedule defined
        // TODO: implement command logic

        $this->info('[Arkzen:scheduler-test] ✓ Done');
        return Command::SUCCESS;
    }
}
