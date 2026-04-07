<?php

// ============================================================
// ARKZEN GENERATED JOB — ProcessDataJob
// Tatemono: job-test
// Queue: default | Tries: 3 | Timeout: 30s
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-07T00:08:30.594634Z
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
        Log::info('[Arkzen Job] JobTest\\ProcessDataJob started', $this->data);

        // TODO: implement job logic

        Log::info('[Arkzen Job] JobTest\\ProcessDataJob completed');
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('[Arkzen Job] JobTest\\ProcessDataJob failed', [
            'error' => $exception->getMessage(),
            'data'  => $this->data,
        ]);
    }
}
