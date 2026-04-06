<?php

// ============================================================
// ARKZEN ENGINE — EVENT BUILDER v2.1 (FIXED)
// Generates Laravel Event classes.
// Declared in @arkzen:events section as:
//   events:
//     order-placed:
//       listeners: [SendOrderConfirmation, UpdateInventory]
//
// ISOLATION: Each tatemono gets its own folder + namespace.
//   Path:      app/Events/Arkzen/{slugNs}/{ClassName}.php
//   Namespace: App\Events\Arkzen\{slugNs}
//
// FIXED: Physical directory now uses $slugNs (namespace-safe name)
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class EventBuilder
{
    public static function build(array $module): void
    {
        $rawSections = $module['events'] ?? [];
        if (empty($rawSections)) return;

        $slug   = $module['name'];
        $slugNs = self::toNamespace($slug);

        // FIXED v2.2: Bridge sends raw YAML strings from the frontend parser.
        // Each string is one @arkzen:events:name block's content.
        // Parse each string and merge all event definitions into one flat map.
        $events = [];
        foreach ($rawSections as $raw) {
            if (!is_string($raw)) {
                // Already parsed (legacy path) — merge directly
                if (is_array($raw)) $events = array_merge($events, $raw);
                continue;
            }
            $parsed = yaml_parse($raw);
            if (is_array($parsed)) {
                $events = array_merge($events, $parsed);
            }
        }

        if (empty($events)) return;

        File::ensureDirectoryExists(app_path("Events/Arkzen/{$slugNs}"));

        foreach ($events as $name => $config) {
            self::buildEvent($slug, $slugNs, $name, is_array($config) ? $config : []);
        }
    }

    private static function buildEvent(string $slug, string $slugNs, string $name, array $config): void
    {
        $className = self::toClassName($name);
        // FIXED: Use $slugNs for file path
        $filePath  = app_path("Events/Arkzen/{$slugNs}/{$className}.php");

        $content = "<?php

// ============================================================
// ARKZEN GENERATED EVENT — {$className}
// Tatemono: {$slug}
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// ============================================================

namespace App\\Events\\Arkzen\\{$slugNs};

use Illuminate\\Broadcasting\\InteractsWithSockets;
use Illuminate\\Foundation\\Events\\Dispatchable;
use Illuminate\\Queue\\SerializesModels;

class {$className}
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly array \$data = []
    ) {}
}
";

        File::put($filePath, $content);
        Log::info("[Arkzen Event] ✓ {$slugNs}\\{$className}");

        foreach ($config['listeners'] ?? [] as $listenerName) {
            // ListenerBuilder must also be fixed separately (not shown)
            ListenerBuilder::buildForEvent($slug, $className, $listenerName);
        }
    }

    public static function toClassName(string $name): string
    {
        return str_replace(' ', '', ucwords(str_replace(['-', '_'], ' ', $name)));
    }

    public static function toNamespace(string $slug): string
    {
        return str_replace(' ', '', ucwords(str_replace(['-', '_'], ' ', $slug)));
    }
}