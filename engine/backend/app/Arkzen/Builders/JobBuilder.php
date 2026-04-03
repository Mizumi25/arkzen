<?php

// ============================================================
// ARKZEN ENGINE — JOB BUILDER
// Generates Laravel Job classes for background processing.
// Declared in @arkzen:jobs section.
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class JobBuilder
{
    public static function build(array $module): void
    {
        $jobs = $module['jobs'] ?? [];
        if (empty($jobs)) return;

        File::ensureDirectoryExists(app_path('Jobs/Arkzen'));

        foreach ($jobs as $name => $config) {
            self::buildJob($name, $config);
        }
    }

    // ─────────────────────────────────────────────
    // BUILD SINGLE JOB
    // ─────────────────────────────────────────────

    private static function buildJob(string $name, array $config): void
    {
        $className = self::toClassName($name);
        $queue     = $config['queue']   ?? 'default';
        $tries     = $config['tries']   ?? 3;
        $timeout   = $config['timeout'] ?? 60;
        $filePath  = app_path("Jobs/Arkzen/{$className}.php");

        $content = "<?php

// ============================================================
// ARKZEN GENERATED JOB — {$className}
// Queue: {$queue} | Tries: {$tries} | Timeout: {$timeout}s
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// ============================================================

namespace App\Jobs\Arkzen;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class {$className} implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int \$tries   = {$tries};
    public int \$timeout = {$timeout};

    public function __construct(
        public readonly array \$data = []
    ) {
        \$this->onQueue('{$queue}');
    }

    public function handle(): void
    {
        Log::info('[Arkzen Job] Running: {$className}', \$this->data);

        // TODO: implement job logic for {$name}
    }

    public function failed(\Throwable \$exception): void
    {
        Log::error('[Arkzen Job] Failed: {$className}', [
            'error' => \$exception->getMessage(),
            'data'  => \$this->data,
        ]);
    }
}
";

        File::put($filePath, $content);
        Log::info("[Arkzen Job] ✓ Job created: {$className} (queue: {$queue})");
    }

    private static function toClassName(string $name): string
    {
        return str_replace(' ', '', ucwords(str_replace(['-', '_'], ' ', $name))) . 'Job';
    }
}