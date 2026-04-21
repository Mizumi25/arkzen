<?php

// ============================================================
// ARKZEN ENGINE — NOTIFICATION BUILDER v3.9
// v3.9: toMail() body injection. PHP body between */ and :end in
//       @arkzen:notifications:name block → base64 `toMail_body` key →
//       decoded and injected into toMail() instead of the generic stub.
// v3.8: Added channel_type DSL key to notification blocks.
//       Supported values: private (default), public, presence.
//       - private  → PrivateChannel('{slug}.{notifiable->id}')
//       - public   → Channel('{slug}.notifications')
//       - presence → PresenceChannel('{slug}.{notifiable->id}')
//       broadcastOn() is generated only when 'broadcast' is in
//       the channels list. channel_type only affects broadcast
//       channel class — mail and database channels are unchanged.
//       Default remains 'private' so existing tatemonos need no
//       DSL changes.
//
// v3.7: Fixed constructor to accept and store $notifiable.
//       Resolves broadcast failures caused by null $this->notifiable.
// v3.6: Added explicit $notifiable property (PHP 8.2+ dynamic prop fix).
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
        $className   = self::toClassName($name);
        $channels    = $config['channels'] ?? ['database'];
        $channelType = $config['channel_type'] ?? 'private'; // NEW v3.8

        // Fix: YAML parsing sometimes returns a comma-string instead of array
        if (is_string($channels)) {
            $channels = array_map('trim', explode(',', $channels));
        }

        $message  = $config['message'] ?? 'You have a new notification.';
        $subject  = $config['subject'] ?? $className;
        $filePath = app_path("Notifications/Arkzen/{$slugNs}/{$className}.php");

        $channelList    = self::generateChannelList($channels);
        // v3.9: decode optional toMail_body injected from DSL block body
        $toMailBodyEncoded = $config['toMail_body'] ?? '';
        $toMailBody        = $toMailBodyEncoded ? base64_decode($toMailBodyEncoded) : '';
        $channelMethods = self::generateChannelMethods($channels, $message, $subject, $toMailBody);

        $broadcastOnMethod = in_array('broadcast', $channels)
            ? self::generateBroadcastOnMethod($slug, $channelType)
            : '';

        // Build use statements — only import what the channel type needs
        $useStatements = self::generateUseStatements($channels, $channelType);

        $content = "<?php

// ============================================================
// ARKZEN GENERATED NOTIFICATION — {$className}
// Tatemono: {$slug}
// Channels: " . implode(', ', $channels) . "
// Broadcast channel type: {$channelType}
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// ============================================================

namespace App\\Notifications\\Arkzen\\{$slugNs};

use Illuminate\\Bus\\Queueable;
use Illuminate\\Notifications\\Notification;
use Illuminate\\Contracts\\Queue\\ShouldQueue;
use Illuminate\\Notifications\\Messages\\MailMessage;
{$useStatements}
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
        Log::info("[Arkzen Notification] ✓ {$slugNs}\\{$className} (broadcast channel_type: {$channelType})");
    }

    private static function generateUseStatements(array $channels, string $channelType): string
    {
        if (!in_array('broadcast', $channels)) return '';

        $class = match($channelType) {
            'public'   => "use Illuminate\\Broadcasting\\Channel;",
            'presence' => "use Illuminate\\Broadcasting\\PresenceChannel;",
            default    => "use Illuminate\\Broadcasting\\PrivateChannel;",
        };

        return $class . "\n";
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

    private static function generateChannelMethods(array $channels, string $message, string $subject, string $toMailBody = ''): string
    {
        $methods = [];

        if (in_array('mail', $channels)) {
            if ($toMailBody && trim($toMailBody) !== '') {
                // v3.9: injected body from @arkzen:notifications:name DSL block
                $indented = self::indentBody(trim($toMailBody));
                $methods[] = "    public function toMail(object \$notifiable): MailMessage
    {
{$indented}
    }";
            } else {
                $methods[] = "    public function toMail(object \$notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('{$subject}')
            ->line('{$message}')
            ->action('View', url('/'))
            ->line('Thank you for using our application.');
    }";
            }
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

    private static function indentBody(string $body): string
    {
        $lines = explode("\n", $body);
        return implode("\n", array_map(fn($l) => '        ' . $l, $lines));
    }

    private static function generateBroadcastOnMethod(string $slug, string $channelType): string
    {
        $channelExpr = match($channelType) {
            'public'   => "new Channel('{$slug}.notifications')",
            'presence' => "new PresenceChannel('{$slug}.' . \$this->notifiable->id)",
            default    => "new PrivateChannel('{$slug}.' . \$this->notifiable->id)",
        };

        return "
    public function broadcastOn(): array
    {
        return [{$channelExpr}];
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