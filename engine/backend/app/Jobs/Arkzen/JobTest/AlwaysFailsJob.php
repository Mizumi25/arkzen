<?php

// ============================================================
// ARKZEN GENERATED JOB — AlwaysFailsJob
// Tatemono: job-test
// Queue: default | Tries: 2 | Timeout: 10s
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-21T21:27:34.262611Z
// ============================================================

namespace App\Jobs\Arkzen\JobTest;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class AlwaysFailsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 2;
    public int $timeout = 10;

    public function __construct(
        public readonly array $data = []
    ) {
        $this->onQueue('default');
    }

    public function handle(): void
    {
        throw new \Exception('This job always fails');
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('[Arkzen Job] Failed: JobTest\\AlwaysFailsJob', [
            'error' => $exception->getMessage(),
            'data'  => $this->data,
        ]);
    }
}
