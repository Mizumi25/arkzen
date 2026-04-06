<?php

// ============================================================
// ARKZEN ENGINE — CONSOLE BUILDER v2.1 (FIXED)
// Generates Artisan Command classes.
// Declared in @arkzen:console section.
//
// ISOLATION:
//   Path:      app/Console/Commands/Arkzen/{slugNs}/{ClassName}Command.php
//   Namespace: App\Console\Commands\Arkzen\{slugNs}
//
// FIXED: Physical directory now uses $slugNs (namespace-safe name)
//   inventory-management → InventoryManagement (both namespace AND folder)
//
// NOTE ON SIGNATURES: Artisan signatures are globally unique in
// Laravel (they're registered in the CLI table). To avoid collision
// between tatemonos, the signature is auto-scoped to:
//   {slug}:{command-name}
// Unless the tatemono explicitly overrides it.
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class ConsoleBuilder
{
    public static function build(array $module): void
    {
        $rawSections = $module['consoles'] ?? [];
        if (empty($rawSections)) return;

        $slug   = $module['name'];
        $slugNs = EventBuilder::toNamespace($slug);

        // FIXED v2.2: Parse raw YAML strings from the frontend bridge.
        $commands = [];
        foreach ($rawSections as $raw) {
            if (!is_string($raw)) { if (is_array($raw)) $commands = array_merge($commands, $raw); continue; }
            $parsed = yaml_parse($raw);
            if (is_array($parsed)) $commands = array_merge($commands, $parsed);
        }
        if (empty($commands)) return;

        File::ensureDirectoryExists(app_path("Console/Commands/Arkzen/{$slugNs}"));

        foreach ($commands as $name => $config) {
            self::buildCommand($slug, $slugNs, $name, is_array($config) ? $config : []);
        }
    }

    // ─────────────────────────────────────────────
    // BUILD SINGLE COMMAND
    // ─────────────────────────────────────────────

    private static function buildCommand(string $slug, string $slugNs, string $name, array $config): void
    {
        $className   = self::toClassName($name);
        // Auto-scope signature to slug to prevent cross-tatemono collision
        $signature   = $config['signature']   ?? "{$slug}:{$name}";
        $description = $config['description'] ?? "Arkzen [{$slug}] command: {$name}";
        $schedule    = $config['schedule']    ?? null;

        // FIXED: Use $slugNs for file path
        $filePath    = app_path("Console/Commands/Arkzen/{$slugNs}/{$className}.php");

        $scheduleComment = $schedule
            ? "// Schedule: {$schedule} — register in app/Console/Kernel.php"
            : '// No schedule defined';

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
        \$this->info('[Arkzen:{$slug}] Running: {$signature}');
        Log::info('[Arkzen Command] {$slugNs}\\\\{$className} started');

        // {$scheduleComment}
        // TODO: implement command logic

        \$this->info('[Arkzen:{$slug}] ✓ Done');
        return Command::SUCCESS;
    }
}
";

        File::put($filePath, $content);
        Log::info("[Arkzen Console] ✓ {$slugNs}\\{$className} ({$signature})");
    }

    public static function toClassName(string $name): string
    {
        return str_replace(' ', '', ucwords(str_replace(['-', '_'], ' ', $name))) . 'Command';
    }
}