<?php

// ============================================================
// ARKZEN ENGINE — MAIL BUILDER v3.2
// v3.2: Constructor data fields now default to '' so mailables can
//       always be instantiated without arguments (zero-arg safe).
//       Prevents "Too few arguments" when endpoint body or test
//       code calls new FooMail() without passing data fields.
// v3.1 (kept): Blade view body injection. HTML/Blade content between */ and :end
//       in @arkzen:mail:name block → base64 `blade_body` key →
//       decoded and written as the Blade view instead of the generic stub.
// Generates Laravel Mailable classes + Blade view stubs.
// Declared in @arkzen:mail section.
//
// ISOLATION:
//   Class:     app/Mail/Arkzen/{slugNs}/{ClassName}Mail.php
//   Namespace: App\Mail\Arkzen\{slugNs}
//   View:      resources/views/emails/arkzen/{slug}/{name}.blade.php
//
// Note: View directory uses original $slug for URL readability.
//
// v3.0: $module['mails'] is now a pre-normalised name→config map
//       from ModuleReader::parse(). No yaml_parse here.
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class MailBuilder
{
    public static function build(array $module): void
    {
        $mails = $module['mails'] ?? [];
        if (empty($mails)) return;

        $slug   = $module['name'];
        $slugNs = EventBuilder::toNamespace($slug);

        File::ensureDirectoryExists(app_path("Mail/Arkzen/{$slugNs}"));
        File::ensureDirectoryExists(resource_path("views/emails/arkzen/{$slug}"));

        foreach ($mails as $name => $config) {
            self::buildMail($slug, $slugNs, $name, is_array($config) ? $config : []);
        }
    }

    private static function buildMail(string $slug, string $slugNs, string $name, array $config): void
    {
        $className  = self::toClassName($name);
        $subject    = $config['subject'] ?? $className;
        $viewName   = "emails.arkzen.{$slug}." . strtolower(str_replace(['-', '_'], '-', $name));
        $filePath   = app_path("Mail/Arkzen/{$slugNs}/{$className}.php");

        $dataFields    = $config['data'] ?? [];

        // Laravel injects $message (Illuminate\Mail\Message) into all mail views.
        // If a data field is named 'message' it will collide and cause a type error.
        // Rename any such field to 'mail_message' at generation time.
        if (isset($dataFields['message'])) {
            $dataFields = ['mail_message' => $dataFields['message']] + array_diff_key($dataFields, ['message' => null]);
            Log::warning("[Arkzen Mail] Reserved Blade variable 'message' renamed to 'mail_message' in {$className}");
        }

        $properties    = self::generateProperties($dataFields);
        $constructArgs = self::generateConstructArgs($dataFields);
        $assigns       = self::generateAssigns($dataFields);

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
use Illuminate\\Mail\\Mailable;
use Illuminate\\Mail\\Mailables\\Content;
use Illuminate\\Mail\\Mailables\\Envelope;
use Illuminate\\Queue\\SerializesModels;

class {$className} extends Mailable
{
    use Queueable, SerializesModels;

{$properties}

    public function __construct({$constructArgs})
    {
{$assigns}
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '{$subject}',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: '{$viewName}',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
";

        File::put($filePath, $content);
        Log::info("[Arkzen Mail] ✓ {$slugNs}\\{$className}");

        // v3.1: decode optional blade_body from DSL block body
        $bladeBodyEncoded = $config['blade_body'] ?? '';
        $bladeBody        = $bladeBodyEncoded ? base64_decode($bladeBodyEncoded) : '';
        self::generateView($slug, $viewName, $subject, $dataFields, $bladeBody);
    }

    private static function generateView(string $slug, string $viewName, string $subject, array $dataFields, string $bladeBody = ''): void
    {
        $viewPath = resource_path('views/' . str_replace('.', '/', $viewName) . '.blade.php');

        if ($bladeBody && trim($bladeBody) !== '') {
            // v3.1: use injected Blade/HTML body from DSL block
            $view = $bladeBody;
        } else {
            // Fallback: generic stub
            $varLines = array_map(fn($f) => "<p>{{ \${$f} }}</p>", array_keys($dataFields));
            $varBlock = implode("\n    ", $varLines);
            $view = "<!DOCTYPE html>
<html>
<head><meta charset=\"UTF-8\"><title>{$subject}</title></head>
<body style=\"font-family: sans-serif; padding: 40px; color: #333;\">
    <h2>{$subject}</h2>
    <p style=\"color: #666; font-size: 12px;\">Tatemono: {$slug}</p>
    <hr>
    {$varBlock}
    <hr>
    <p style=\"color: #999; font-size: 12px;\">This email was generated by Arkzen.</p>
</body>
</html>
";
        }

        File::ensureDirectoryExists(dirname($viewPath));
        File::put($viewPath, $view);
        Log::info("[Arkzen Mail] ✓ View: {$viewName}");
    }

    private static function generateProperties(array $fields): string
    {
        if (empty($fields)) return '';
        return implode("\n", array_map(
            fn($field) => "    public readonly string \${$field};",
            array_keys($fields)
        ));
    }

    private static function generateConstructArgs(array $fields): string
    {
        if (empty($fields)) return '';
        return implode(', ', array_map(
            fn($field) => "string \${$field} = ''",
            array_keys($fields)
        ));
    }

    private static function generateAssigns(array $fields): string
    {
        if (empty($fields)) return '';
        return implode("\n", array_map(
            fn($field) => "        \$this->{$field} = \${$field};",
            array_keys($fields)
        ));
    }

    public static function toClassName(string $name): string
    {
        return str_replace(' ', '', ucwords(str_replace(['-', '_'], ' ', $name))) . 'Mail';
    }
}