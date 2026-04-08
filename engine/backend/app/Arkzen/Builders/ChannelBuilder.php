<?php

// ============================================================
// ARKZEN ENGINE — CHANNEL BUILDER v3.0
// Generates Laravel channel authorization in channels.php.
// Controls who can subscribe to private/presence channels.
// Works alongside BroadcastBuilder.
//
// v3.0: $module['realtimes'] is now a pre-normalised map:
//         ['channels' => [...], 'events' => [...]]
//       from ModuleReader::parseRealtimeSections(). No yaml_parse here.
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class ChannelBuilder
{
    public static function build(array $module): void
    {
        $channels = $module['realtimes']['channels'] ?? [];
        if (empty($channels)) return;

        self::ensureChannelsFile();

        foreach ($channels as $channelName => $config) {
            self::registerChannel($channelName, is_array($config) ? $config : [], $module['name']);
        }
    }

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

    private static function registerChannel(string $channelName, array $config, string $moduleName): void
    {
        $channelsPath = base_path('routes/channels.php');
        $type         = $config['type'] ?? 'private';
        $auth         = $config['auth'] ?? 'authenticated';
        $content      = File::get($channelsPath);

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

        $idParam = $auth === 'owner' ? ", \$id" : "";

        $channelLine = match($type) {
            'presence' => "
// Module: {$moduleName}
Broadcast::channel('{$channelName}', function (\$user{$idParam}) {
    {$authLogic}
    // Presence: return user info array for member list
    return ['id' => \$user->id, 'name' => \$user->name];
});
",
            default => "
// Module: {$moduleName}
Broadcast::channel('{$channelName}', function (\$user{$idParam}) {
    {$authLogic}
});
",
        };

        File::append($channelsPath, $channelLine);
        Log::info("[Arkzen Channel] ✓ Channel registered: {$channelName} ({$type}, auth: {$auth}) for module: {$moduleName}");
    }
}