<?php

// ============================================================
// ARKZEN ENGINE — NOTIFICATION BUILDER v3.7
// v3.7: Fixed constructor to accept and store $notifiable.
//       This resolves broadcast failures caused by null $this->notifiable.
// v3.6: Added explicit $notifiable property to generated
//       notification class (PHP 8.2+ dynamic property fix).
// v3.5: Fixed broadcastOn signature (no parameters) and uses
//       private channel for secure user-specific notifications.
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

        // 🔧 FIX: If YAML parsing failed and left a string, convert to array
        if (is_string($channels)) {
            $channels = array_map('trim', explode(',', $channels));
        }

        $message    = $config['message']  ?? 'You have a new notification.';
        $subject    = $config['subject']  ?? $className;
        $filePath   = app_path("Notifications/Arkzen/{$slugNs}/{$className}.php");

        $channelList    = self::generateChannelList($channels);
        $channelMethods = self::generateChannelMethods($channels, $message, $subject);
        $broadcastOnMethod = in_array('broadcast', $channels)
            ? self::generateBroadcastOnMethod($slug)
            : '';

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

    /**
     * The notifiable entity (user).
     *
     * @var object
     */
    public \$notifiable;

    /**
     * Additional data for the notification.
     *
     * @var array
     */
    public array \$data;

    /**
     * Create a new notification instance.
     */
    public function __construct(object \$notifiable, array \$data = [])
    {
        \$this->notifiable = \$notifiable;
        \$this->data       = \$data;
    }

    public function via(object \$notifiable): array
    {
        return {$channelList};
    }

{$channelMethods}
{$broadcastOnMethod}
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

    private static function generateBroadcastOnMethod(string $slug): string
    {
        return "
    public function broadcastOn(): array
    {
        return [new \\Illuminate\\Broadcasting\\PrivateChannel('{$slug}.' . \$this->notifiable->id)];
    }

    public function broadcastAs(): string
    {
        return '{$slug}.notification';
    }
";
    }

    public static function toClassName(string $name): string
    {
        return str_replace(' ', '', ucwords(str_replace(['-', '_'], ' ', $name))) . 'Notification';
    }
}