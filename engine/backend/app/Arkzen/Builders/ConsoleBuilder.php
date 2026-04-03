<?php

// ============================================================
// ARKZEN ENGINE — CONSOLE BUILDER
// Generates Artisan Command classes.
// Declared in @arkzen:console section.
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

        File::ensureDirectoryExists(app_path('Console/Commands/Arkzen'));

        foreach ($commands as $name => $config) {
            self::buildCommand($name, $config);
        }
    }

    // ─────────────────────────────────────────────
    // BUILD SINGLE COMMAND
    // ─────────────────────────────────────────────

    private static function buildCommand(string $name, array $config): void
    {
        $className   = self::toClassName($name);
        $signature   = $config['signature']   ?? "arkzen:{$name}";
        $description = $config['description'] ?? "Arkzen command: {$name}";
        $schedule    = $config['schedule']    ?? null;
        $filePath    = app_path("Console/Commands/Arkzen/{$className}.php");

        $scheduleComment = $schedule
            ? "// Schedule: {$schedule} — register in app/Console/Kernel.php"
            : "// No schedule defined";

        $content = "<?php

// ============================================================
// ARKZEN GENERATED COMMAND — {$className}
// Signature: {$signature}
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// ============================================================

namespace App\Console\Commands\Arkzen;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class {$className} extends Command
{
    protected \$signature   = '{$signature}';
    protected \$description = '{$description}';

    public function handle(): int
    {
        \$this->info('[Arkzen] Running: {$signature}');
        Log::info('[Arkzen Command] {$className} started');

        // {$scheduleComment}
        // TODO: implement command logic

        \$this->info('[Arkzen] ✓ Done');
        return Command::SUCCESS;
    }
}
";

        File::put($filePath, $content);
        Log::info("[Arkzen Console] ✓ Command created: {$className} ({$signature})");
    }

    private static function toClassName(string $name): string
    {
        return str_replace(' ', '', ucwords(str_replace(['-', '_'], ' ', $name))) . 'Command';
    }
}