<?php

// ============================================================
// ARKZEN ENGINE — MAIL BUILDER v2.2 (FIXED)
// Generates Laravel Mailable classes.
// Declared in @arkzen:mail section as:
//   welcome-mail:
//     subject: "Welcome to Arkzen"
//     data:
//       username: string
//       app_name: string
//
// ISOLATION:
//   Path:      app/Mail/Arkzen/{slugNs}/{ClassName}.php
//   Namespace: App\Mail\Arkzen\{slugNs}
//
// FIXED: Physical directory now uses $slugNs (namespace-safe name)
//
// FIXED v2.2: Bridge sends ArkzenSection objects { raw, start, end } —
//   not raw strings and not pre-parsed arrays. The old fallback path was
//   doing array_merge($mails, $raw) which merged the object's own keys
//   (raw, start, end) as mail names, generating StartMail, RawMail, EndMail.
//   Now we extract $raw['raw'] and yaml_parse it correctly.
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class MailBuilder
{
    public static function build(array $module): void
    {
        $rawSections = $module['mails'] ?? [];
        if (empty($rawSections)) return;

        $slug   = $module['name'];
        $slugNs = EventBuilder::toNamespace($slug);

        $mails = [];
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
                $mails = array_merge($mails, $parsed);
            }
        }

        if (empty($mails)) return;

        File::ensureDirectoryExists(app_path("Mail/Arkzen/{$slugNs}"));

        foreach ($mails as $name => $config) {
            self::buildMail($slug, $slugNs, $name, is_array($config) ? $config : []);
        }
    }

    // ─────────────────────────────────────────────
    // BUILD SINGLE MAILABLE
    // ─────────────────────────────────────────────

    private static function buildMail(string $slug, string $slugNs, string $name, array $config): void
    {
        $className = self::toClassName($name);
        $subject   = $config['subject'] ?? ucwords(str_replace(['-', '_'], ' ', $name));
        $dataFields = $config['data']   ?? [];

        $filePath  = app_path("Mail/Arkzen/{$slugNs}/{$className}.php");

        // Build constructor properties from declared data fields
        $properties   = '';
        $constructArgs = '';
        if (!empty($dataFields)) {
            $props = [];
            $args  = [];
            foreach ($dataFields as $field => $type) {
                $phpType = is_string($type) ? self::toPhpType($type) : 'mixed';
                $props[] = "    public readonly {$phpType} \${$field},";
                $args[]  = "\${$field}";
            }
            $constructArgs = "\n        " . implode(",\n        ", array_map(
                fn($f, $t) => 'public readonly ' . (is_string($t) ? self::toPhpType($t) : 'mixed') . " \${$f}",
                array_keys($dataFields),
                array_values($dataFields)
            )) . "\n    ";
        }

        $viewData = '';
        if (!empty($dataFields)) {
            $pairs = array_map(fn($f) => "            '{$f}' => \$this->{$f},", array_keys($dataFields));
            $viewData = "\n" . implode("\n", $pairs) . "\n        ";
        }

        $content = "<?php

// ============================================================
// ARKZEN GENERATED MAILABLE — {$className}
// Tatemono: {$slug}
// Subject: {$subject}
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// ============================================================

namespace App\\Mail\\Arkzen\\{$slugNs};

use Illuminate\\Bus\\Queueable;
use Illuminate\\Contracts\\Queue\\ShouldQueue;
use Illuminate\\Mail\\Mailable;
use Illuminate\\Mail\\Mailables\\Content;
use Illuminate\\Mail\\Mailables\\Envelope;
use Illuminate\\Queue\\SerializesModels;

class {$className} extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct({$constructArgs}) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '{$subject}',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'arkzen.{$slug}.{$name}',
            with: [{$viewData}],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
";

        File::put($filePath, $content);
        Log::info("[Arkzen Mail] ✓ {$slugNs}\\{$className} (subject: {$subject})");
    }

    private static function toPhpType(string $type): string
    {
        return match (strtolower($type)) {
            'string'  => 'string',
            'int',
            'integer' => 'int',
            'bool',
            'boolean' => 'bool',
            'float'   => 'float',
            'array'   => 'array',
            default   => 'string',
        };
    }

    public static function toClassName(string $name): string
    {
        return str_replace(' ', '', ucwords(str_replace(['-', '_'], ' ', $name)));
    }
}