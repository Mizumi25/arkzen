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
// FIXED v2.1: Physical directory now uses $slugNs
// FIXED v2.2: Now reads $module['realtimes'] (plural) to match ModuleReader
//   output. Previously read $module['realtime'] (singular) — always empty,
//   so no broadcast event files were ever generated. (namespace-safe name)
//   inventory-management → InventoryManagement (both namespace AND folder)
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
        $realtime = $module['realtimes'] ?? [];
        if (empty($realtime['events'])) return;

        $slug   = $module['name'];                          // tatemono slug e.g. inventory-management
        $slugNs = EventBuilder::toNamespace($slug);        // e.g. InventoryManagement
        
        // FIXED: Use $slugNs for directory (namespace-safe), not $slug
        File::ensureDirectoryExists(app_path("Events/Arkzen/{$slugNs}/Broadcast"));

        foreach ($realtime['events'] as $name => $config) {
            self::buildBroadcastEvent($slug, $slugNs, $name, $config);
        }
    }

    // ─────────────────────────────────────────────
    // BUILD BROADCAST EVENT
    // ─────────────────────────────────────────────

    private static function buildBroadcastEvent(string $slug, string $slugNs, string $name, array $config): void
    {
        $className   = self::toClassName($name);
        $channelName = $config['channel']  ?? $slug;
        $channelType = $config['type']     ?? 'public';
        
        // FIXED: Use $slugNs for file path (namespace-safe)
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