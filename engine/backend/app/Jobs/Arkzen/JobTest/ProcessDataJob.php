<?php

// ============================================================
// ARKZEN GENERATED JOB — ProcessDataJob
// Tatemono: job-test
// Queue: default | Tries: 3 | Timeout: 30s
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-26T13:23:44.801987Z
// ============================================================

namespace App\Jobs\Arkzen\JobTest;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessDataJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 30;

    public function __construct(
        public readonly array $data = []
    ) {
        $this->onQueue('default');
    }

    public function handle(): void
    {
        $start = microtime(true);
            // Simulate work
            sleep(2);
            \App\Models\Arkzen\JobTest\JobResult::create([
                'job_name'     => 'process-data',
                'status'       => 'completed',
                'result'       => 'Data processed successfully in ' . round((microtime(true) - $start) * 1000) . 'ms',
                'processed_at' => now(),
            ]);
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('[Arkzen Job] Failed: JobTest\\ProcessDataJob', [
            'error' => $exception->getMessage(),
            'data'  => $this->data,
        ]);
    }
}
