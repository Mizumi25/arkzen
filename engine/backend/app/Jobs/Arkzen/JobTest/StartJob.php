<?php

// ============================================================
// ARKZEN GENERATED JOB — StartJob
// Tatemono: job-test
// Queue: default | Tries: 3 | Timeout: 60s
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-06T23:20:46.756708Z
// ============================================================

namespace App\Jobs\Arkzen\JobTest;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class StartJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 60;

    public function __construct(
        public readonly array $data = []
    ) {
        $this->onQueue('default');
    }

    public function handle(): void
    {
        Log::info('[Arkzen Job] Running: JobTest\\StartJob', $this->data);

        // TODO: implement job logic for start
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('[Arkzen Job] Failed: JobTest\\StartJob', [
            'error' => $exception->getMessage(),
            'data'  => $this->data,
        ]);
    }
}
