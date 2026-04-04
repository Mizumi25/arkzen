<?php

// ============================================================
// ARKZEN ENGINE — LISTENER BUILDER v2.1 (FIXED)
// Generates Laravel Listener classes tied to Events.
// Called by EventBuilder — not called directly.
//
// ISOLATION:
//   Path:      app/Listeners/Arkzen/{slugNs}/{ClassName}.php
//   Namespace: App\Listeners\Arkzen\{slugNs}
//   Imports:   App\Events\Arkzen\{slugNs}\{EventClass}
//
// FIXED: Physical directory now uses $slugNs (namespace-safe name)
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class ListenerBuilder
{
    public static function build(array $module): void
    {
        $slug   = $module['name'];
        $slugNs = EventBuilder::toNamespace($slug);
        $events = $module['events'] ?? [];

        foreach ($events as $eventName => $config) {
            $eventClass = EventBuilder::toClassName($eventName);
            foreach ($config['listeners'] ?? [] as $listenerName) {
                self::buildForEvent($slug, $slugNs, $eventClass, $listenerName);
            }
        }
    }

    // ─────────────────────────────────────────────
    // BUILD LISTENER FOR A SPECIFIC EVENT
    // ─────────────────────────────────────────────

    public static function buildForEvent(string $slug, string $slugNs, string $eventClassName, string $listenerName): void
    {
        $className  = str_replace(' ', '', ucwords(str_replace(['-', '_'], ' ', $listenerName)));
        
        // FIXED: Use $slugNs for file path
        $filePath   = app_path("Listeners/Arkzen/{$slugNs}/{$className}.php");

        File::ensureDirectoryExists(app_path("Listeners/Arkzen/{$slugNs}"));

        $content = "<?php

// ============================================================
// ARKZEN GENERATED LISTENER — {$className}
// Tatemono: {$slug}
// Listens to: App\\Events\\Arkzen\\{$slugNs}\\{$eventClassName}
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// ============================================================

namespace App\\Listeners\\Arkzen\\{$slugNs};

use App\\Events\\Arkzen\\{$slugNs}\\{$eventClassName};
use Illuminate\\Contracts\\Queue\\ShouldQueue;
use Illuminate\\Queue\\InteractsWithQueue;
use Illuminate\\Support\\Facades\\Log;

class {$className} implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle({$eventClassName} \$event): void
    {
        Log::info('[Arkzen Listener] {$slugNs}\\\\{$className} fired', \$event->data);

        // TODO: implement listener logic
    }
}
";

        File::put($filePath, $content);
        Log::info("[Arkzen Listener] ✓ {$slugNs}\\{$className} → {$eventClassName}");
    }
}