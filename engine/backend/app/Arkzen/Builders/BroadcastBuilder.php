<?php

// ============================================================
// ARKZEN ENGINE — BROADCAST BUILDER v2.2 (FIXED)
// Generates Laravel Broadcast Event classes for Reverb.
// Declared in @arkzen:realtime section.
//
// ISOLATION:
//   Path:      app/Events/Arkzen/{slugNs}/Broadcast/{ClassName}.php
//   Namespace: App\Events\Arkzen\{slugNs}\Broadcast
//
// FIXED: Physical directory now uses $slugNs (namespace-safe name)
//   inventory-management → InventoryManagement (both namespace AND folder)
//
// FIXED v2.2: Bridge sends ArkzenSection objects { raw, start, end } —
//   not raw strings and not pre-parsed arrays. The old fallback path was
//   doing array_merge($broadcastEvents, $raw['events']) which only worked
//   if the object had an 'events' key — silently no-oping otherwise and
//   leaving the builder unable to read any broadcast events.
//   Now we extract $raw['raw'], yaml_parse it, then pull 'events' from
//   the parsed result correctly.
//
// Works with ChannelBuilder — Broadcast pushes data,
// Channel controls who can subscribe.
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class BroadcastBuilder
{
    public static function build(array $module): void
    {
        $rawSections = $module['realtimes'] ?? [];
        if (empty($rawSections)) return;

        $slug   = $module['name'];
        $slugNs = EventBuilder::toNamespace($slug);

        $broadcastEvents = [];
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
            if (is_array($parsed) && isset($parsed['events'])) {
                $broadcastEvents = array_merge($broadcastEvents, $parsed['events']);
            }
        }

        if (empty($broadcastEvents)) return;

        File::ensureDirectoryExists(app_path("Events/Arkzen/{$slugNs}/Broadcast"));

        foreach ($broadcastEvents as $name => $config) {
            self::buildBroadcastEvent($slug, $slugNs, $name, is_array($config) ? $config : []);
        }
    }

    // ─────────────────────────────────────────────
    // BUILD BROADCAST EVENT
    // ─────────────────────────────────────────────

    private static function buildBroadcastEvent(string $slug, string $slugNs, string $name, array $config): void
    {
        $className   = self::toClassName($name);
        $channelName = $config['channel'] ?? $slug;
        $channelType = $config['type']    ?? 'public';

        $filePath    = app_path("Events/Arkzen/{$slugNs}/Broadcast/{$className}.php");

        $channelMethod = match($channelType) {
            'private'  => "new PrivateChannel('{$channelName}')",
            'presence' => "new PresenceChannel('{$channelName}')",
            default    => "new Channel('{$channelName}')",
        };

        $useStatements = match($channelType) {
            'private'  => "use Illuminate\\Broadcasting\\PrivateChannel;",
            'presence' => "use Illuminate\\Broadcasting\\PresenceChannel;",
            default    => "use Illuminate\\Broadcasting\\Channel;",
        };

        $content = "<?php

// ============================================================
// ARKZEN GENERATED BROADCAST EVENT — {$className}
// Tatemono: {$slug}
// Channel: {$channelName} ({$channelType})
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// ============================================================

namespace App\\Events\\Arkzen\\{$slugNs}\\Broadcast;

use Illuminate\\Broadcasting\\InteractsWithSockets;
use Illuminate\\Contracts\\Broadcasting\\ShouldBroadcast;
use Illuminate\\Foundation\\Events\\Dispatchable;
use Illuminate\\Queue\\SerializesModels;
{$useStatements}

class {$className} implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly array \$data = []
    ) {}

    public function broadcastOn(): array
    {
        return [{$channelMethod}];
    }

    public function broadcastAs(): string
    {
        // Scoped event name: tatemono.event-name
        return '{$slug}.{$name}';
    }

    public function broadcastWith(): array
    {
        return \$this->data;
    }
}
";

        File::put($filePath, $content);
        Log::info("[Arkzen Broadcast] ✓ {$slugNs}\\Broadcast\\{$className} on {$channelName}");
    }

    public static function toClassName(string $name): string
    {
        return str_replace(' ', '', ucwords(str_replace(['-', '_'], ' ', $name)));
    }
}