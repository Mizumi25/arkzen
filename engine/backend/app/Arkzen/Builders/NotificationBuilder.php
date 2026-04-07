<?php

// ============================================================
// ARKZEN ENGINE — NOTIFICATION BUILDER v2.2 (FIXED)
// Generates Laravel Notification classes.
// Declared in @arkzen:notifications section as:
//   database-ping:
//     channels: [database]
//     message: "You have a new database notification"
//     subject: "Database Ping"
//
// ISOLATION:
//   Path:      app/Notifications/Arkzen/{slugNs}/{ClassName}.php
//   Namespace: App\Notifications\Arkzen\{slugNs}
//
// FIXED: Physical directory now uses $slugNs (namespace-safe name)
//
// FIXED v2.2: Bridge sends ArkzenSection objects { raw, start, end } —
//   not raw strings and not pre-parsed arrays. The old fallback path was
//   doing array_merge($notifications, $raw) which merged the object's own
//   keys (raw, start, end) as notification names, generating
//   StartNotification, RawNotification, EndNotification.
//   Now we extract $raw['raw'] and yaml_parse it correctly.
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class NotificationBuilder
{
    public static function build(array $module): void
    {
        $rawSections = $module['notifications'] ?? [];
        if (empty($rawSections)) return;

        $slug   = $module['name'];
        $slugNs = EventBuilder::toNamespace($slug);

        $notifications = [];
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
            if (is_array($parsed)) {
                $notifications = array_merge($notifications, $parsed);
            }
        }

        if (empty($notifications)) return;

        File::ensureDirectoryExists(app_path("Notifications/Arkzen/{$slugNs}"));

        foreach ($notifications as $name => $config) {
            self::buildNotification($slug, $slugNs, $name, is_array($config) ? $config : []);
        }
    }

    // ─────────────────────────────────────────────
    // BUILD SINGLE NOTIFICATION
    // ─────────────────────────────────────────────

    private static function buildNotification(string $slug, string $slugNs, string $name, array $config): void
    {
        $className = self::toClassName($name);
        $channels  = $config['channels'] ?? ['database'];
        $message   = $config['message']  ?? "Notification: {$name}";
        $subject   = $config['subject']  ?? ucwords(str_replace(['-', '_'], ' ', $name));

        $filePath  = app_path("Notifications/Arkzen/{$slugNs}/{$className}.php");

        $channelList = implode(', ', array_map(fn($c) => "'{$c}'", $channels));

        $hasDatabase  = in_array('database', $channels);
        $hasMail      = in_array('mail', $channels);
        $hasBroadcast = in_array('broadcast', $channels);

        $databaseMethod = $hasDatabase ? "
    public function toDatabase(object \$notifiable): array
    {
        return [
            'message' => '{$message}',
            'data'    => \$this->data,
        ];
    }
" : '';

        $mailMethod = $hasMail ? "
    public function toMail(object \$notifiable): \\Illuminate\\Notifications\\Messages\\MailMessage
    {
        return (new \\Illuminate\\Notifications\\Messages\\MailMessage)
            ->subject('{$subject}')
            ->line('{$message}')
            ->line('Thank you for using Arkzen!');
    }
" : '';

        $broadcastMethod = $hasBroadcast ? "
    public function toBroadcast(object \$notifiable): \\Illuminate\\Notifications\\Messages\\BroadcastMessage
    {
        return new \\Illuminate\\Notifications\\Messages\\BroadcastMessage([
            'message' => '{$message}',
            'data'    => \$this->data,
        ]);
    }
" : '';

        $content = "<?php

// ============================================================
// ARKZEN GENERATED NOTIFICATION — {$className}
// Tatemono: {$slug}
// Channels: {$channelList}
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// ============================================================

namespace App\\Notifications\\Arkzen\\{$slugNs};

use Illuminate\\Bus\\Queueable;
use Illuminate\\Contracts\\Queue\\ShouldQueue;
use Illuminate\\Notifications\\Notification;

class {$className} extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly array \$data = []
    ) {}

    public function via(object \$notifiable): array
    {
        return [{$channelList}];
    }
{$databaseMethod}{$mailMethod}{$broadcastMethod}
    public function toArray(object \$notifiable): array
    {
        return \$this->data;
    }
}
";

        File::put($filePath, $content);
        Log::info("[Arkzen Notification] ✓ {$slugNs}\\{$className} (channels: {$channelList})");
    }

    public static function toClassName(string $name): string
    {
        return str_replace(' ', '', ucwords(str_replace(['-', '_'], ' ', $name)));
    }
}