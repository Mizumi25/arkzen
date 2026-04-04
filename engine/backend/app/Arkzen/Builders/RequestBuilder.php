<?php

// ============================================================
// ARKZEN ENGINE — REQUEST BUILDER
// PATCHED v5.1: Tatemono-slug folder isolation
//   Before: Http/Requests/Arkzen/InventoryStoreRequest.php
//   After:  Http/Requests/Arkzen/inventory-management/InventoryStoreRequest.php
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class RequestBuilder
{
    public static function build(array $module): void
    {
        $api       = $module['api'];
        $name      = $module['name'];                               // tatemono slug
        $modelName = $api['model'];
        $endpoints = $api['endpoints'] ?? [];

        File::ensureDirectoryExists(app_path("Http/Requests/Arkzen/{$name}"));

        foreach ($endpoints as $endpointName => $endpoint) {
            if (empty($endpoint['validation'])) continue;
            self::buildRequest($modelName, $endpointName, $endpoint, $name);
        }
    }

    private static function buildRequest(string $modelName, string $endpointName, array $endpoint, string $tatSlug): void
    {
        $suffix      = ucfirst($endpointName);
        $requestName = "{$modelName}{$suffix}Request";
        $filePath    = app_path("Http/Requests/Arkzen/{$tatSlug}/{$requestName}.php");

        $rules = self::generateRules($endpoint['validation']);

        $content = "<?php

// ============================================================
// ARKZEN GENERATED REQUEST — {$requestName}
// Tatemono: {$tatSlug}
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// ============================================================

namespace App\Http\Requests\Arkzen\\{$tatSlug};

use Illuminate\Foundation\Http\FormRequest;

class {$requestName} extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
{$rules}
        ];
    }

    public function messages(): array { return []; }
}
";

        File::put($filePath, $content);
        Log::info("[Arkzen Request] ✓ Request created: {$tatSlug}/{$requestName}");
    }

    private static function generateRules(array $validation): string
    {
        $lines = [];
        foreach ($validation as $field => $rule) {
            $lines[] = "            '{$field}' => '{$rule}',";
        }
        return implode("\n", $lines);
    }
}