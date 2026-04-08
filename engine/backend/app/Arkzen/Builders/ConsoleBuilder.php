<?php

// ============================================================
// ARKZEN ENGINE — CONSOLE BUILDER v3.0
// Generates Artisan Command classes.
// Declared in @arkzen:console section.
//
// ISOLATION:
//   Path:      app/Console/Commands/Arkzen/{slugNs}/{ClassName}Command.php
//   Namespace: App\Console\Commands\Arkzen\{slugNs}
//
// NOTE ON SIGNATURES: Artisan signatures are globally unique in
// Laravel. To avoid collision between tatemonos, the signature
// is auto-scoped to {slug}:{command-name} unless overridden.
//
// v3.0: $module['consoles'] is now a pre-normalised name→config map
//       from ModuleReader::parse(). No yaml_parse here.
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