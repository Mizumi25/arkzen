<?php

// ============================================================
// ARKZEN ENGINE — EVENT BUILDER v3.0
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
// v3.0: $module['events'] is now a pre-normalised name→config map
//       from ModuleReader::parse(). No yaml_parse here.
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class EventBuilder
{
    public static function build(array $module): void
    {
        $events = $module['events'] ?? [];
        if (empty($events)) return;

        $slug   = $module['name'];
        $slugNs = self::toNamespace($slug);

        File::ensureDirectoryExists(app_path("Events/Arkzen/{$slugNs}"));

        foreach ($events as $name => $config) {
            self::buildEvent($slug, $slugNs, $name, is_array($config) ? $config : []);
        }
    }

    private static function buildEvent(string $slug, string $slugNs, string $name, array $config): void
    {
        $className = self::toClassName($name);
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
            ListenerBuilder::buildForEvent($slug, $slugNs, $className, $listenerName);
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