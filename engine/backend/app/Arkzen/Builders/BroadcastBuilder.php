<?php

// ============================================================
// ARKZEN ENGINE — BROADCAST BUILDER v2.0 (slug-isolated)
// Generates Laravel Broadcast Event classes for Reverb.
// Declared in @arkzen:realtime section.
//
// ISOLATION:
//   Path:      app/Events/Arkzen/{slug}/Broadcast/{ClassName}.php
//   Namespace: App\Events\Arkzen\{Slug}\Broadcast
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
        $realtime = $module['realtime'] ?? [];
        if (empty($realtime['events'])) return;

        $slug = $module['name'];
        File::ensureDirectoryExists(app_path("Events/Arkzen/{$slug}/Broadcast"));

        foreach ($realtime['events'] as $name => $config) {
            self::buildBroadcastEvent($slug, $name, $config);
        }
    }

    // ─────────────────────────────────────────────
    // BUILD BROADCAST EVENT
    // ─────────────────────────────────────────────

    private static function buildBroadcastEvent(string $slug, string $name, array $config): void
    {
        $className   = self::toClassName($name);
        $slugNs      = EventBuilder::toNamespace($slug);
        $channelName = $config['channel']  ?? $slug;
        $channelType = $config['type']     ?? 'public';
        $filePath    = app_path("Events/Arkzen/{$slug}/Broadcast/{$className}.php");

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
