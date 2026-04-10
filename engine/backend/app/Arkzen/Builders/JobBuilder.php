<?php

// ============================================================
// ARKZEN ENGINE — JOB BUILDER v3.1
// Generates Laravel Job classes for background processing.
// Declared in @arkzen:jobs:name ... @arkzen:jobs:name:end blocks.
//
// Block format (mirrors @arkzen:console):
//   /* @arkzen:jobs:process-data
//   queue: default
//   tries: 3
//   timeout: 30
//   */
//   public function handle(): void
//   {
//       // your job logic here
//   }
//   /* @arkzen:jobs:process-data:end */
//
// ISOLATION:
//   Path:      app/Jobs/Arkzen/{slugNs}/{ClassName}Job.php
//   Namespace: App\Jobs\Arkzen\{slugNs}
//
// v3.1: Body from tatemono injected into handle(). No yaml_parse here.
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

        // Decode handle() body written in the tatemono
        $bodyEncoded = $config['body'] ?? '';
        $body        = $bodyEncoded ? base64_decode($bodyEncoded) : null;

        // If no body was written, emit a stub
        $handleBody = $body
            ? self::indentBody($body)
            : "        Log::info('[Arkzen Job] Running: {$slugNs}\\\\{$className}', \$this->data);\n\n        // TODO: implement job logic for {$name}";

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
{$handleBody}
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

    // ─────────────────────────────────────────────
    // INDENT BODY — ensure handle() body is properly indented
    // ─────────────────────────────────────────────

    private static function indentBody(string $body): string
    {
        // Strip the outer function signature if the user wrote it —
        // we only want the lines inside handle() { ... }
        // Match: public function handle(): void { ... }
        if (preg_match('/public\s+function\s+handle\s*\(\s*\)\s*(?::\s*void\s*)?\{(.+)\}/s', $body, $matches)) {
            $inner = trim($matches[1]);
        } else {
            $inner = trim($body);
        }

        // Re-indent each line to 8 spaces (inside handle())
        $lines = explode("\n", $inner);
        return implode("\n", array_map(fn($l) => '        ' . $l, $lines));
    }

    public static function toClassName(string $name): string
    {
        return str_replace(' ', '', ucwords(str_replace(['-', '_'], ' ', $name))) . 'Job';
    }
}