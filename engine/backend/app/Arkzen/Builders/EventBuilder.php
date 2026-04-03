<?php

// ============================================================
// ARKZEN ENGINE — EVENT BUILDER
// Generates Laravel Event classes.
// Declared in @arkzen:events section as:
//   events:
//     order-placed:
//       listeners: [SendOrderConfirmation, UpdateInventory]
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

        File::ensureDirectoryExists(app_path('Events/Arkzen'));

        foreach ($events as $name => $config) {
            self::buildEvent($name, $config);
        }
    }

    private static function buildEvent(string $name, array $config): void
    {
        $className = self::toClassName($name);
        $filePath  = app_path("Events/Arkzen/{$className}.php");

        $content = "<?php

// ============================================================
// ARKZEN GENERATED EVENT — {$className}
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// ============================================================

namespace App\Events\Arkzen;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class {$className}
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly array \$data = []
    ) {}
}
";

        File::put($filePath, $content);
        Log::info("[Arkzen Event] ✓ Event created: {$className}");

        // Build all listeners for this event
        foreach ($config['listeners'] ?? [] as $listenerName) {
            ListenerBuilder::buildForEvent($className, $listenerName);
        }
    }

    public static function toClassName(string $name): string
    {
        return str_replace(' ', '', ucwords(str_replace(['-', '_'], ' ', $name)));
    }
}