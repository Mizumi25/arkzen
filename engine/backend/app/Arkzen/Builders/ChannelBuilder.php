<?php

// ============================================================
// ARKZEN ENGINE — CHANNEL BUILDER v2.2 (FIXED)
// Generates Laravel channel authorization in channels.php.
// Controls who can subscribe to private/presence channels.
// Works alongside BroadcastBuilder.
//
// FIXED v2.2: Bridge sends ArkzenSection objects { raw, start, end } —
//   not raw strings and not pre-parsed arrays. The old fallback path was
//   checking isset($raw['channels']) on the ArkzenSection object — which
//   never had a 'channels' key, so channel auth was silently never written.
//   Now we extract $raw['raw'], yaml_parse it, then pull 'channels' from
//   the parsed result correctly.
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

        $channels = [];
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

use Illuminate\\Support\\Facades\\Broadcast;

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
        $type         = $config['type'] ?? 'private';
        $auth         = $config['auth'] ?? 'authenticated';
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

        $ownerParam = $auth === 'owner' ? ", \$id" : "";

        $channelLine = match($type) {
            'presence' => "
// Module: {$moduleName}
Broadcast::channel('{$channelName}', function (\$user{$ownerParam}) {
    {$authLogic}
    // Presence: return user info array for member list
    return ['id' => \$user->id, 'name' => \$user->name];
});
",
            default => "
// Module: {$moduleName}
Broadcast::channel('{$channelName}', function (\$user{$ownerParam}) {
    {$authLogic}
});
",
        };

        File::append($channelsPath, $channelLine);
        Log::info("[Arkzen Channel] ✓ Channel registered: {$channelName} ({$type}, auth: {$auth}) for module: {$moduleName}");
    }
}