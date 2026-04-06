<?php

// ============================================================
// ARKZEN ENGINE — CHANNEL BUILDER
// Generates Laravel channel authorization in channels.php.
// Controls who can subscribe to private/presence channels.
// Works alongside BroadcastBuilder.
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class ChannelBuilder
{
    public static function build(array $module): void
    {
        $rawSections = $module['realtimes'] ?? [];
        if (empty($rawSections)) return;

        // FIXED v2.2: Parse raw YAML strings from the frontend bridge.
        // Each raw string is one @arkzen:realtime:name block.
        // Merge all 'channels' sub-keys across all blocks.
        $channels = [];
        foreach ($rawSections as $raw) {
            if (!is_string($raw)) {
                if (is_array($raw) && isset($raw['channels'])) {
                    $channels = array_merge($channels, $raw['channels']);
                }
                continue;
            }
            $parsed = yaml_parse($raw);
            if (is_array($parsed) && isset($parsed['channels'])) {
                $channels = array_merge($channels, $parsed['channels']);
            }
        }
        if (empty($channels)) return;

        self::ensureChannelsFile();

        foreach ($channels as $channelName => $config) {
            self::registerChannel($channelName, is_array($config) ? $config : [], $module['name']);
        }
    }

    // ─────────────────────────────────────────────
    // ENSURE channels.php EXISTS
    // ─────────────────────────────────────────────

    private static function ensureChannelsFile(): void
    {
        $channelsPath = base_path('routes/channels.php');

        if (!File::exists($channelsPath)) {
            File::put($channelsPath, "<?php

use Illuminate\Support\Facades\Broadcast;

// ============================================================
// ARKZEN GENERATED CHANNEL AUTHORIZATIONS
// DO NOT EDIT DIRECTLY. Arkzen manages this file.
// ============================================================

");
            Log::info("[Arkzen Channel] ✓ channels.php created");
        }
    }

    // ─────────────────────────────────────────────
    // REGISTER CHANNEL AUTHORIZATION
    // ─────────────────────────────────────────────

    private static function registerChannel(string $channelName, array $config, string $moduleName): void
    {
        $channelsPath = base_path('routes/channels.php');
        $type         = $config['type']    ?? 'private';
        $auth         = $config['auth']    ?? 'authenticated';
        $content      = File::get($channelsPath);

        // Skip if already registered
        if (str_contains($content, "'{$channelName}'")) {
            Log::info("[Arkzen Channel] Channel already registered: {$channelName}");
            return;
        }

        $authLogic = match($auth) {
            'owner'         => "return \$user->id === (int) \$id;",
            'admin'         => "return \$user->role === 'admin';",
            'authenticated' => "return \$user !== null;",
            default         => "return \$user !== null;",
        };

        $channelLine = match($type) {
            'presence' => "
// Module: {$moduleName}
Broadcast::channel('{$channelName}', function (\$user" . ($auth === 'owner' ? ", \$id" : "") . ") {
    {$authLogic}
    // Presence: return user info array for member list
    return ['id' => \$user->id, 'name' => \$user->name];
});
",
            default => "
// Module: {$moduleName}
Broadcast::channel('{$channelName}', function (\$user" . ($auth === 'owner' ? ", \$id" : "") . ") {
    {$authLogic}
});
",
        };

        File::append($channelsPath, $channelLine);
        Log::info("[Arkzen Channel] ✓ Channel registered: {$channelName} ({$type}, auth: {$auth}) for module: {$moduleName}");
    }
}