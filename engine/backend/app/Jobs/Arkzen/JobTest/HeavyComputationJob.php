<?php

// ============================================================
// ARKZEN GENERATED JOB — HeavyComputationJob
// Tatemono: job-test
// Queue: heavy | Tries: 1 | Timeout: 120s
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-19T13:33:42.439057Z
// ============================================================

namespace App\Jobs\Arkzen\JobTest;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class HeavyComputationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 1;
    public int $timeout = 120;

    public function __construct(
        public readonly array $data = []
    ) {
        $this->onQueue('heavy');
    }

    public function handle(): void
    {
        $start = microtime(true);
            // Simulate heavy work
            sleep(5);
            \App\Models\Arkzen\JobTest\JobResult::create([
                'job_name'     => 'heavy-computation',
                'status'       => 'completed',
                'result'       => 'Heavy computation completed in ' . round((microtime(true) - $start) * 1000) . 'ms',
                'processed_at' => now(),
            ]);
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('[Arkzen Job] Failed: JobTest\\HeavyComputationJob', [
            'error' => $exception->getMessage(),
            'data'  => $this->data,
        ]);
    }
}
