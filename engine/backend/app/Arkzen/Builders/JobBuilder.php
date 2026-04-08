<?php

// ============================================================
// ARKZEN ENGINE — JOB BUILDER v3.0
// Generates Laravel Job classes for background processing.
// Declared in @arkzen:jobs section.
//
// ISOLATION:
//   Path:      app/Jobs/Arkzen/{slugNs}/{ClassName}Job.php
//   Namespace: App\Jobs\Arkzen\{slugNs}
//
// v3.0: $module['jobs'] is now a pre-normalised name→config map
//       from ModuleReader::parse(). No yaml_parse here.
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

        $slug   = $module['name'];
        $slugNs = EventBuilder::toNamespace($slug);

        File::ensureDirectoryExists(app_path("Jobs/Arkzen/{$slugNs}"));

        foreach ($jobs as $name => $config) {
            self::buildJob($slug, $slugNs, $name, is_array($config) ? $config : []);
        }
    }

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
        Log::info('[Arkzen Job] Running: {$slugNs}\\\\{$className}', \$this->data);

        // TODO: implement job logic for {$name}
    }

    public function failed(\Throwable \$exception): void
    {
        Log::error('[Arkzen Job] Failed: {$slugNs}\\\\{$className}', [
            'error' => \$exception->getMessage(),
            'data'  => \$this->data,
        ]);
    }
}
";

        File::put($filePath, $content);
        Log::info("[Arkzen Job] ✓ {$slugNs}\\{$className} (queue: {$queue})");
    }

    public static function toClassName(string $name): string
    {
        return str_replace(' ', '', ucwords(str_replace(['-', '_'], ' ', $name))) . 'Job';
    }
}