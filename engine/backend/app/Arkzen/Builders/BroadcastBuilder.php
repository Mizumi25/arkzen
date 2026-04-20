<?php

// ============================================================
// ARKZEN ENGINE — BROADCAST BUILDER v3.2
//
// v3.2: Rewrote file generation to use string concatenation
//       (same pattern as every other Arkzen builder). The v3.1
//       heredoc approach produced double-escaped backslashes in
//       namespace declarations, causing PHP parse errors in the
//       generated event files.
//
// v3.1: Private channels with {id} placeholder generate events
//       that accept a $userId arg and build the channel name
//       dynamically: new PrivateChannel('slug.' . $this->userId)
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class BroadcastBuilder
{
    public static function build(array $module): void
    {
        $broadcastEvents = $module['realtimes']['events'] ?? [];
        if (empty($broadcastEvents)) return;

        $slug   = $module['name'];
        $slugNs = EventBuilder::toNamespace($slug);

        File::ensureDirectoryExists(app_path("Events/Arkzen/{$slugNs}/Broadcast"));

        foreach ($broadcastEvents as $name => $config) {
            self::buildBroadcastEvent($slug, $slugNs, $name, is_array($config) ? $config : []);
        }
    }

    private static function buildBroadcastEvent(string $slug, string $slugNs, string $name, array $config): void
    {
        $className   = self::toClassName($name);
        $channelName = $config['channel'] ?? $slug;
        $channelType = $config['type']    ?? 'public';
        $filePath    = app_path("Events/Arkzen/{$slugNs}/Broadcast/{$className}.php");

        $hasIdPlaceholder = str_contains($channelName, '{id}');

        if ($channelType === 'private' && $hasIdPlaceholder) {
            $staticPart      = str_replace('.{id}', '', $channelName);
            $useStatement    = "use Illuminate\\Broadcasting\\PrivateChannel;";
            $channelMethod   = "new PrivateChannel('{$staticPart}.' . \$this->userId)";
            $constructorArgs = "        public readonly ?int \$userId = null,\n"
                             . "        public readonly array \$data = []";
        } elseif ($channelType === 'private') {
            $useStatement    = "use Illuminate\\Broadcasting\\PrivateChannel;";
            $channelMethod   = "new PrivateChannel('{$channelName}')";
            $constructorArgs = "        public readonly array \$data = []";
        } elseif ($channelType === 'presence') {
            $useStatement    = "use Illuminate\\Broadcasting\\PresenceChannel;";
            $channelMethod   = "new PresenceChannel('{$channelName}')";
            $constructorArgs = "        public readonly array \$data = []";
        } else {
            $useStatement    = "use Illuminate\\Broadcasting\\Channel;";
            $channelMethod   = "new Channel('{$channelName}')";
            $constructorArgs = "        public readonly array \$data = []";
        }

        $generated = now()->toISOString();

        $content = "<?php\n"
            . "\n"
            . "// ============================================================\n"
            . "// ARKZEN GENERATED BROADCAST EVENT — {$className}\n"
            . "// Tatemono: {$slug}\n"
            . "// Channel: {$channelName} ({$channelType})\n"
            . "// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.\n"
            . "// Generated: {$generated}\n"
            . "// ============================================================\n"
            . "\n"
            . "namespace App\\Events\\Arkzen\\{$slugNs}\\Broadcast;\n"
            . "\n"
            . "use Illuminate\\Broadcasting\\InteractsWithSockets;\n"
            . "use Illuminate\\Contracts\\Broadcasting\\ShouldBroadcast;\n"
            . "use Illuminate\\Foundation\\Events\\Dispatchable;\n"
            . "use Illuminate\\Queue\\SerializesModels;\n"
            . "{$useStatement}\n"
            . "\n"
            . "class {$className} implements ShouldBroadcast\n"
            . "{\n"
            . "    use Dispatchable, InteractsWithSockets, SerializesModels;\n"
            . "\n"
            . "    public function __construct(\n"
            . "{$constructorArgs}\n"
            . "    ) {}\n"
            . "\n"
            . "    public function broadcastOn(): array\n"
            . "    {\n"
            . "        return [{$channelMethod}];\n"
            . "    }\n"
            . "\n"
            . "    public function broadcastAs(): string\n"
            . "    {\n"
            . "        return '{$slug}.{$name}';\n"
            . "    }\n"
            . "\n"
            . "    public function broadcastWith(): array\n"
            . "    {\n"
            . "        return \$this->data;\n"
            . "    }\n"
            . "}\n";

        File::put($filePath, $content);
        Log::info("[Arkzen Broadcast] ✓ {$slugNs}\\Broadcast\\{$className} on {$channelName}");
    }

    public static function toClassName(string $name): string
    {
        return str_replace(' ', '', ucwords(str_replace(['-', '_'], ' ', $name)));
    }
}