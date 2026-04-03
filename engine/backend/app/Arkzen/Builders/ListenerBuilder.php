<?php

// ============================================================
// ARKZEN ENGINE — LISTENER BUILDER
// Generates Laravel Listener classes tied to Events.
// Called by EventBuilder — not called directly.
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class ListenerBuilder
{
    public static function build(array $module): void
    {
        // Called via EventBuilder which handles listener creation
        // This static entry point is kept for direct invocation if needed
        $events = $module['events'] ?? [];
        foreach ($events as $eventName => $config) {
            $eventClass = EventBuilder::toClassName($eventName);
            foreach ($config['listeners'] ?? [] as $listenerName) {
                self::buildForEvent($eventClass, $listenerName);
            }
        }
    }

    // ─────────────────────────────────────────────
    // BUILD LISTENER FOR A SPECIFIC EVENT
    // ─────────────────────────────────────────────

    public static function buildForEvent(string $eventClassName, string $listenerName): void
    {
        $className = str_replace(' ', '', ucwords(str_replace(['-', '_'], ' ', $listenerName)));
        $filePath  = app_path("Listeners/Arkzen/{$className}.php");

        File::ensureDirectoryExists(app_path('Listeners/Arkzen'));

        $content = "<?php

// ============================================================
// ARKZEN GENERATED LISTENER — {$className}
// Listens to: App\Events\Arkzen\\{$eventClassName}
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// ============================================================

namespace App\Listeners\Arkzen;

use App\Events\Arkzen\\{$eventClassName};
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class {$className} implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle({$eventClassName} \$event): void
    {
        Log::info('[Arkzen Listener] {$className} fired', \$event->data);

        // TODO: implement listener logic
    }
}
";

        File::put($filePath, $content);
        Log::info("[Arkzen Listener] ✓ Listener created: {$className} → {$eventClassName}");
    }
}