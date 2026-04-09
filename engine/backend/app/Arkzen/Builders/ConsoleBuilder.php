<?php

// ============================================================
// ARKZEN ENGINE — CONSOLE BUILDER v4.0
// Generates Artisan Command classes.
// Declared in @arkzen:console:name ... @arkzen:console:name:end blocks.
//
// Block format (mirrors @arkzen:page):
//   /* @arkzen:console:cleanup-temp
//   signature: scheduler-test:cleanup-temp
//   description: Deletes temporary files older than 24h
//   schedule: '0 * * * *'
//   */
//   public function handle(): int
//   {
//       // your logic here
//       return Command::SUCCESS;
//   }
//   /* @arkzen:console:cleanup-temp:end */
//
// ISOLATION:
//   Path:      app/Console/Commands/Arkzen/{slugNs}/{ClassName}Command.php
//   Namespace: App\Console\Commands\Arkzen\{slugNs}
//
// SCHEDULE AUTO-REGISTRATION:
//   If schedule: is declared, ConsoleBuilder appends to
//   app/Console/Kernel.php automatically. No manual setup needed.
//
// v4.0: Body from tatemono injected into handle(). Schedule
//       auto-registered in Kernel.php. No yaml_parse here.
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class ConsoleBuilder
{
    public static function build(array $module): void
    {
        $commands = $module['consoles'] ?? [];
        if (empty($commands)) return;

        $slug   = $module['name'];
        $slugNs = EventBuilder::toNamespace($slug);

        File::ensureDirectoryExists(app_path("Console/Commands/Arkzen/{$slugNs}"));

        foreach ($commands as $name => $config) {
            self::buildCommand($slug, $slugNs, $name, is_array($config) ? $config : []);
        }
    }

    private static function buildCommand(string $slug, string $slugNs, string $name, array $config): void
    {
        $className   = self::toClassName($name);
        $signature   = $config['signature']   ?? "{$slug}:{$name}";
        $description = $config['description'] ?? "Arkzen [{$slug}] command: {$name}";
        $schedule    = $config['schedule']    ?? null;
        $filePath    = app_path("Console/Commands/Arkzen/{$slugNs}/{$className}.php");

        // Decode handle() body written in the tatemono
        // Body is base64-encoded by the TS parser to safely embed multiline PHP in YAML
        $bodyEncoded = $config['body'] ?? '';
        $body        = $bodyEncoded ? base64_decode($bodyEncoded) : null;

        // If no body was written in the tatemono, emit a stub
        $handleBody  = $body
            ? self::indentBody($body)
            : "        \$this->info('[Arkzen:{$slug}] Running: {$signature}');\n        Log::info('[Arkzen Command] {$slugNs}\\\\{$className} started');\n\n        // TODO: implement command logic\n\n        \$this->info('[Arkzen:{$slug}] ✓ Done');\n        return Command::SUCCESS;";

        $content = "<?php

// ============================================================
// ARKZEN GENERATED COMMAND — {$className}
// Tatemono: {$slug}
// Signature: {$signature}
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// ============================================================

namespace App\\Console\\Commands\\Arkzen\\{$slugNs};

use Illuminate\\Console\\Command;
use Illuminate\\Support\\Facades\\Log;

class {$className} extends Command
{
    protected \$signature   = '{$signature}';
    protected \$description = '{$description}';

    public function handle(): int
    {
{$handleBody}
    }
}
";

        File::put($filePath, $content);
        Log::info("[Arkzen Console] ✓ {$slugNs}\\{$className} ({$signature})");

        // Auto-register schedule in Kernel.php if declared
        if ($schedule) {
            self::registerSchedule($signature, $schedule, $slug);
        }
    }

    // ─────────────────────────────────────────────
    // AUTO-REGISTER SCHEDULE IN Kernel.php
    // ─────────────────────────────────────────────

    private static function registerSchedule(string $signature, string $schedule, string $slug): void
    {
        $consolePath = base_path('routes/console.php');

        // Ensure routes/console.php exists (Laravel 11+ standard)
        if (!File::exists($consolePath)) {
            File::put($consolePath, "<?php

use Illuminate\\Support\\Facades\\Schedule;

// ============================================================
// ARKZEN AUTO-REGISTERED SCHEDULES
// DO NOT EDIT DIRECTLY. Arkzen manages this file.
// ============================================================

");
            Log::info("[Arkzen Console] ✓ routes/console.php created");
        }

        $content = File::get($consolePath);
        $entry   = "Schedule::command('{$signature}')->cron('{$schedule}'); // [{$slug}]";

        // Skip if already registered
        if (str_contains($content, "'{$signature}'")) {
            Log::info("[Arkzen Console] Schedule already registered: {$signature}");
            return;
        }

        File::append($consolePath, "\n{$entry}\n");
        Log::info("[Arkzen Console] ✓ Schedule registered: {$signature} ({$schedule})");
    }

    // ─────────────────────────────────────────────
    // INDENT BODY — ensure handle() body is properly indented
    // ─────────────────────────────────────────────

    private static function indentBody(string $body): string
    {
        // Strip the outer function signature if the user wrote it —
        // we only want the lines inside handle() { ... }
        // Match: public function handle(): int { ... }
        if (preg_match('/public\s+function\s+handle\s*\(\s*\)\s*(?::\s*\w+\s*)?\{(.+)\}/s', $body, $matches)) {
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
        return str_replace(' ', '', ucwords(str_replace(['-', '_'], ' ', $name))) . 'Command';
    }
}