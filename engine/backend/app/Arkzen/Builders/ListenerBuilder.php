<?php

// ============================================================
// ARKZEN ENGINE — LISTENER BUILDER v3.1
// Generates Laravel Listener classes tied to Events.
// Called by EventBuilder — not called directly.
//
// ISOLATION:
//   Path:      app/Listeners/Arkzen/{slugNs}/{ClassName}.php
//   Namespace: App\Listeners\Arkzen\{slugNs}
//   Imports:   App\Events\Arkzen\{slugNs}\{EventClass}
//
// v3.1: Listeners now insert records into the tatemono's event_log table
//       instead of just logging. The UI shows these entries.
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class ListenerBuilder
{
    public static function build(array $module): void
    {
        $events = $module['events'] ?? [];
        if (empty($events)) return;

        $slug   = $module['name'];
        $slugNs = EventBuilder::toNamespace($slug);

        foreach ($events as $eventName => $config) {
            $eventClass = EventBuilder::toClassName($eventName);
            foreach ($config['listeners'] ?? [] as $listenerName) {
                self::buildForEvent($slug, $slugNs, $eventClass, $listenerName);
            }
        }
    }

    public static function buildForEvent(
        string $slug,
        string $slugNs,
        string $eventClassName,
        string $listenerName
    ): void {
        $className = str_replace(' ', '', ucwords(str_replace(['-', '_'], ' ', $listenerName)));
        $filePath  = app_path("Listeners/Arkzen/{$slugNs}/{$className}.php");
        $logModel = "\\App\\Models\\Arkzen\\{$slugNs}\\EventLog";

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
use {$logModel};

class {$className} implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle({$eventClassName} \$event): void
    {
        \$start = microtime(true);
        
        {$logModel}::create([
            'event_name'    => class_basename(\$event),
            'listener_name' => class_basename(\$this),
            'status'        => 'completed',
            'payload'       => json_encode(\$event->data),
            'duration_ms'   => (int) ((microtime(true) - \$start) * 1000),
        ]);
    }
}
";

        File::put($filePath, $content);
        Log::info("[Arkzen Listener] ✓ {$slugNs}\\{$className} → {$eventClassName}");
    }
}