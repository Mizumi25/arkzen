<?php

// ============================================================
// ARKZEN ENGINE — LISTENER BUILDER v2.2 (FIXED)
// Generates Laravel Listener classes tied to Events.
// Called by EventBuilder — not called directly.
//
// ISOLATION:
//   Path:      app/Listeners/Arkzen/{slugNs}/{ClassName}.php
//   Namespace: App\Listeners\Arkzen\{slugNs}
//   Imports:   App\Events\Arkzen\{slugNs}\{EventClass}
//
// FIXED: Physical directory now uses $slugNs (namespace-safe name)
//
// FIXED v2.2: ListenerBuilder::build() is called from the engine with
//   $module['events'] which at that point is still the raw ArkzenSection
//   array — not a pre-parsed map of event name => config. The old build()
//   method iterated it as if it were already parsed (foreach $events as
//   $eventName => $config), which would hit raw/start/end as keys.
//   build() is now corrected to parse each ArkzenSection first, then
//   iterate the resulting event map.
//   buildForEvent() is unchanged — it is called correctly by EventBuilder
//   after EventBuilder has already parsed the YAML.
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class ListenerBuilder
{
    public static function build(array $module): void
    {
        $rawSections = $module['events'] ?? [];
        if (empty($rawSections)) return;

        $slug   = $module['name'];
        $slugNs = EventBuilder::toNamespace($slug);

        // Parse ArkzenSection objects into a flat event map first
        $events = [];
        foreach ($rawSections as $raw) {
            // Bridge sends ArkzenSection objects: { raw: "yaml...", start: 0, end: 0 }
            // Extract the 'raw' string from the object before parsing.
            if (!is_string($raw)) {
                if (is_array($raw) && isset($raw['raw']) && is_string($raw['raw'])) {
                    $raw = $raw['raw'];
                } else {
                    continue;
                }
            }
            $parsed = ArkzenYaml::parse($raw);
            if (is_array($parsed)) {
                $events = array_merge($events, $parsed);
            }
        }

        foreach ($events as $eventName => $config) {
            $eventClass = EventBuilder::toClassName($eventName);
            foreach ((is_array($config) ? $config : [])['listeners'] ?? [] as $listenerName) {
                self::buildForEvent($slug, $slugNs, $eventClass, $listenerName);
            }
        }
    }

    // ─────────────────────────────────────────────
    // BUILD LISTENER FOR A SPECIFIC EVENT
    // Called directly by EventBuilder after it has already parsed the YAML.
    // ─────────────────────────────────────────────

    public static function buildForEvent(string $slug, string $slugNs, string $eventClassName, string $listenerName): void
    {
        $className = str_replace(' ', '', ucwords(str_replace(['-', '_'], ' ', $listenerName)));

        $filePath  = app_path("Listeners/Arkzen/{$slugNs}/{$className}.php");

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