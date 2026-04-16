<?php

// ============================================================
// ARKZEN GENERATED COMMAND — GenerateReportCommand
// Tatemono: scheduler-test
// Signature: scheduler-test:generate-report
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-15T15:38:24.267555Z
// ============================================================

namespace App\Console\Commands\Arkzen\SchedulerTest;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class GenerateReportCommand extends Command
{
    protected $signature   = 'scheduler-test:generate-report';
    protected $description = 'Generates a daily activity report';

    public function handle(): int
    {
        $start = microtime(true);
            $this->info('[Arkzen:scheduler-test] Generating report...');
        
            \App\Models\Arkzen\SchedulerTest\CommandRun::create([
                'command_name' => 'generate-report',
                'signature'    => 'scheduler-test:generate-report',
                'exit_code'    => 0,
                'output'       => 'Daily report generated successfully.',
                'triggered_by' => 'schedule',
                'duration_ms'  => (int) ((microtime(true) - $start) * 1000),
            ]);
        
            $this->info('[Arkzen:scheduler-test] ✓ Done');
            return Command::SUCCESS;
    }
}
