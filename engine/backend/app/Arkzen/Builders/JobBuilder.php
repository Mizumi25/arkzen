<?php

// ============================================================
// ARKZEN ENGINE — JOB BUILDER v2.2 (FIXED)
// Generates Laravel Queued Job classes.
// Declared in @arkzen:jobs section as:
//   process-data:
//     queue: default
//     tries: 3
//     timeout: 30
//
// ISOLATION:
//   Path:      app/Jobs/Arkzen/{slugNs}/{ClassName}Job.php
//   Namespace: App\Jobs\Arkzen\{slugNs}
//
// FIXED: Physical directory now uses $slugNs (namespace-safe name)
//
// FIXED v2.2: Bridge sends ArkzenSection objects { raw, start, end } —
//   not raw strings and not pre-parsed arrays. The old fallback path was
//   doing array_merge($jobs, $raw) which merged the object's own keys
//   (raw, start, end) as job names, generating StartJob, RawJob, EndJob.
//   Now we extract $raw['raw'] and yaml_parse it correctly.
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class JobBuilder
{
    public static function build(array $module): void
    {
        $rawSections = $module['jobs'] ?? [];
        if (empty($rawSections)) return;

        $slug   = $module['name'];
        $slugNs = EventBuilder::toNamespace($slug);

        $jobs = [];
        foreach ($rawSections as $raw) {
            // Bridge sends ArkzenSection objects: { raw: "yaml...", start: 0, end: 0 }
            // Extract the 'raw' string from the object before parsing.
            if (!is_string($raw)) {
                if (is_array($raw) && isset($raw['raw']) && is_string($raw['raw'])) {
                    $raw = $raw['raw'];
                } else {
                    continue;
                }
            }
            $parsed = ArkzenYaml::parse($raw);
            if (is_array($parsed)) {
                $jobs = array_merge($jobs, $parsed);
            }
        }

        if (empty($jobs)) return;

        File::ensureDirectoryExists(app_path("Jobs/Arkzen/{$slugNs}"));

        foreach ($jobs as $name => $config) {
            self::buildJob($slug, $slugNs, $name, is_array($config) ? $config : []);
        }
    }

    // ─────────────────────────────────────────────
    // BUILD SINGLE JOB
    // ─────────────────────────────────────────────

    private static function buildJob(string $slug, string $slugNs, string $name, array $config): void
    {
        $className = self::toClassName($name);
        $queue     = $config['queue']   ?? 'default';
        $tries     = $config['tries']   ?? 3;
        $timeout   = $config['timeout'] ?? 60;

        $filePath  = app_path("Jobs/Arkzen/{$slugNs}/{$className}.php");

        $content = "<?php

// ============================================================
// ARKZEN GENERATED JOB — {$className}
// Tatemono: {$slug}
// Queue: {$queue} | Tries: {$tries} | Timeout: {$timeout}s
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// ============================================================

namespace App\\Jobs\\Arkzen\\{$slugNs};

use Illuminate\\Bus\\Queueable;
use Illuminate\\Contracts\\Queue\\ShouldQueue;
use Illuminate\\Foundation\\Bus\\Dispatchable;
use Illuminate\\Queue\\InteractsWithQueue;
use Illuminate\\Queue\\SerializesModels;
use Illuminate\\Support\\Facades\\Log;

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
        Log::info('[Arkzen Job] {$slugNs}\\\\{$className} started', \$this->data);

        // TODO: implement job logic

        Log::info('[Arkzen Job] {$slugNs}\\\\{$className} completed');
    }

    public function failed(\Throwable \$exception): void
    {
        Log::error('[Arkzen Job] {$slugNs}\\\\{$className} failed', [
            'error' => \$exception->getMessage(),
            'data'  => \$this->data,
        ]);
    }
}
";

        File::put($filePath, $content);
        Log::info("[Arkzen Job] ✓ {$slugNs}\\{$className} (queue: {$queue}, tries: {$tries}, timeout: {$timeout}s)");
    }

    public static function toClassName(string $name): string
    {
        return str_replace(' ', '', ucwords(str_replace(['-', '_'], ' ', $name))) . 'Job';
    }
}