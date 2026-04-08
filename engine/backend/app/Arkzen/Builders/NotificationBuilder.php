<?php

// ============================================================
// ARKZEN ENGINE — NOTIFICATION BUILDER v3.0
// Generates Laravel Notification classes.
// Declared in @arkzen:notifications section.
//
// ISOLATION:
//   Path:      app/Notifications/Arkzen/{slugNs}/{ClassName}Notification.php
//   Namespace: App\Notifications\Arkzen\{slugNs}
//
// v3.0: $module['notifications'] is now a pre-normalised name→config map
//       from ModuleReader::parse(). No yaml_parse here.
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class NotificationBuilder
{
    public static function build(array $module): void
    {
        $notifications = $module['notifications'] ?? [];
        if (empty($notifications)) return;

        $slug   = $module['name'];
        $slugNs = EventBuilder::toNamespace($slug);

        File::ensureDirectoryExists(app_path("Notifications/Arkzen/{$slugNs}"));

        foreach ($notifications as $name => $config) {
            self::buildNotification($slug, $slugNs, $name, is_array($config) ? $config : []);
        }
    }

    private static function buildNotification(string $slug, string $slugNs, string $name, array $config): void
    {
        $className  = self::toClassName($name);
        $channels   = $config['channels'] ?? ['database'];
        $message    = $config['message']  ?? 'You have a new notification.';
        $subject    = $config['subject']  ?? $className;
        $filePath   = app_path("Notifications/Arkzen/{$slugNs}/{$className}.php");

        $channelList    = self::generateChannelList($channels);
        $channelMethods = self::generateChannelMethods($channels, $message, $subject);

        $content = "<?php

// ============================================================
// ARKZEN GENERATED NOTIFICATION — {$className}
// Tatemono: {$slug}
// Channels: " . implode(', ', $channels) . "
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// ============================================================

namespace App\\Notifications\\Arkzen\\{$slugNs};

use Illuminate\\Bus\\Queueable;
use Illuminate\\Notifications\\Notification;
use Illuminate\\Contracts\\Queue\\ShouldQueue;
use Illuminate\\Notifications\\Messages\\MailMessage;

class {$className} extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly array \$data = []
    ) {}

    public function via(object \$notifiable): array
    {
        return {$channelList};
    }

{$channelMethods}

    public function toArray(object \$notifiable): array
    {
        return array_merge([
            'type'     => '{$slugNs}\\\\{$className}',
            'message'  => '{$message}',
            'tatemono' => '{$slug}',
        ], \$this->data);
    }
}
";

        File::put($filePath, $content);
        Log::info("[Arkzen Notification] ✓ {$slugNs}\\{$className}");
    }

    private static function generateChannelList(array $channels): string
    {
        $mapped = array_map(fn($c) => match($c) {
            'mail'      => "'mail'",
            'database'  => "'database'",
            'broadcast' => "'broadcast'",
            default     => "'{$c}'",
        }, $channels);

        return '[' . implode(', ', $mapped) . ']';
    }

    private static function generateChannelMethods(array $channels, string $message, string $subject): string
    {
        $methods = [];

        if (in_array('mail', $channels)) {
            $methods[] = "    public function toMail(object \$notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('{$subject}')
            ->line('{$message}')
            ->action('View', url('/'))
            ->line('Thank you for using our application.');
    }";
        }

        if (in_array('broadcast', $channels)) {
            $methods[] = "    public function toBroadcast(object \$notifiable): array
    {
        return [
            'message' => '{$message}',
            'data'    => \$this->data,
        ];
    }";
        }

        return implode("\n\n", $methods);
    }

    public static function toClassName(string $name): string
    {
        return str_replace(' ', '', ucwords(str_replace(['-', '_'], ' ', $name))) . 'Notification';
    }
}