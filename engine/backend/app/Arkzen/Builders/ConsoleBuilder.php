<?php

// ============================================================
// ARKZEN ENGINE — CONSOLE BUILDER v2.0 (slug-isolated)
// Generates Artisan Command classes.
// Declared in @arkzen:console section.
//
// ISOLATION:
//   Path:      app/Console/Commands/Arkzen/{slug}/{ClassName}Command.php
//   Namespace: App\Console\Commands\Arkzen\{Slug}
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
        $commands = $module['console'] ?? [];
        if (empty($commands)) return;

        $slug = $module['name'];
        File::ensureDirectoryExists(app_path("Console/Commands/Arkzen/{$slug}"));

        foreach ($commands as $name => $config) {
            self::buildCommand($slug, $name, $config);
        }
    }

    // ─────────────────────────────────────────────
    // BUILD SINGLE COMMAND
    // ─────────────────────────────────────────────

    private static function buildCommand(string $slug, string $name, array $config): void
    {
        $className   = self::toClassName($name);
        $slugNs      = EventBuilder::toNamespace($slug);
        // Auto-scope signature to slug to prevent cross-tatemono collision
        $signature   = $config['signature']   ?? "{$slug}:{$name}";
        $description = $config['description'] ?? "Arkzen [{$slug}] command: {$name}";
        $schedule    = $config['schedule']    ?? null;
        $filePath    = app_path("Console/Commands/Arkzen/{$slug}/{$className}.php");

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
