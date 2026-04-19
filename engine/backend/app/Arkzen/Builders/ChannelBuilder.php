<?php

// ============================================================
// ARKZEN ENGINE — CHANNEL BUILDER v3.3
// v3.3: Added buildAuthChannel() as a public standalone method.
//       ArkzenEngineController calls this from Phase 6.5 when a
//       tatemono has auth + notifications but no @arkzen:realtime
//       blocks — ensuring private-{slug}.{id} is always registered
//       in channels.php regardless of whether realtimes exist.
//       build() continues to handle DSL-declared @arkzen:realtime
//       channels + the implicit auth channel injection (for tatemonos
//       that have BOTH realtime blocks and auth+notifications).
//
// v3.2: Fixed channel pattern — Laravel strips the private- prefix
//       before matching, so the registered pattern must NOT include
//       private-. See registerChannel().
// v3.1: Auto-register private-{tatemono}.{userId} channel for auth
//       tatemonos with notifications.
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class ChannelBuilder
{
    // ─────────────────────────────────────────────
    // Called from Phase 9 (realtime block present).
    // Handles DSL-declared channels + implicit auth
    // notification channel when auth+notifications exist.
    // ─────────────────────────────────────────────
    public static function build(array $module): void
    {
        $channels = $module['realtimes']['channels'] ?? [];
        $hasAuth  = $module['auth'] ?? false;
        $hasNotifications = !empty($module['notifications']);

        // Implicit private notification channel — only when auth AND notifications are declared
        if ($hasAuth && $hasNotifications) {
            $slug = $module['name'];
            $channels["{$slug}.{id}"] = [
                'type' => 'private',
                'auth' => 'owner',
            ];
        }

        if (empty($channels)) return;

        self::ensureChannelsFile();

        foreach ($channels as $channelName => $config) {
            self::registerChannel($channelName, is_array($config) ? $config : [], $module['name']);
        }
    }

    // ─────────────────────────────────────────────
    // Called from Phase 6.5 via AuthBuilder::buildAuthChannel().
    // Registers the private notification channel for tatemonos
    // that have auth + notifications but NO @arkzen:realtime blocks
    // (so build() above never runs for them).
    // ─────────────────────────────────────────────
    public static function buildAuthChannel(array $module): void
    {
        if (empty($module['notifications'])) return;

        $slug = $module['name'];

        self::ensureChannelsFile();

        self::registerChannel("{$slug}.{id}", [
            'type' => 'private',
            'auth' => 'owner',
        ], $slug);

        Log::info("[Arkzen Channel] ✓ Auth notification channel registered for: {$slug}");
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
            'owner'         => "return (int) \$user->id === (int) \$id;",
            'admin'         => "return \$user->role === 'admin';",
            'authenticated' => "return \$user !== null;",
            default         => "return \$user !== null;",
        };

        $channelLine = match($type) {
            'presence' => "
// Module: {$moduleName}
Broadcast::channel('{$channelName}', function (\$user, \$id = null) {
    {$authLogic}
    return ['id' => \$user->id, 'name' => \$user->name];
});
",
            'public' => "
// Module: {$moduleName}
Broadcast::channel('{$channelName}', function () {
    return true;
});
",
            default => "
// Module: {$moduleName}
Broadcast::channel('{$channelName}', function (\$user, \$id = null) {
    {$authLogic}
});
",
        };

        File::append($channelsPath, $channelLine);
        Log::info("[Arkzen Channel] ✓ Channel registered: {$channelName} ({$type}, auth: {$auth}) for module: {$moduleName}");
    }
    
        // ChannelBuilder.php — add this new public static method
    public static function buildNotificationChannels(array $module): void
    {
        $notifications = $module['notifications'] ?? [];
        if (empty($notifications)) return;
    
        $slug = $module['name'];
        $hasPublic = false;
    
        foreach ($notifications as $config) {
            $channelType = $config['channel_type'] ?? 'private';
            if ($channelType === 'public') {
                $hasPublic = true;
                break;
            }
        }
    
        if ($hasPublic) {
            self::ensureChannelsFile();
            self::registerChannel(
                "{$slug}.notifications",
                ['type' => 'public'],
                $slug
            );
        }
    }
}