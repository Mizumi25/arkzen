<?php

// ============================================================
// ARKZEN ENGINE — REQUEST BUILDER v5.3 (FIXED)
// FIXED: Physical folder now uses namespace-safe name (no hyphens)
//   inventory-management → InventoryManagement (both namespace AND folder)
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class RequestBuilder
{
    public static function build(array $module): void
    {
        $api       = $module['api'];
        $name      = $module['name'];                               // tatemono slug e.g. inventory-management
        $slugNs    = EventBuilder::toNamespace($name);             // e.g. InventoryManagement
        $modelName = $api['model'];
        $endpoints = $api['endpoints'] ?? [];

        // FIXED: Use $slugNs for directory
        File::ensureDirectoryExists(app_path("Http/Requests/Arkzen/{$slugNs}"));

        foreach ($endpoints as $endpointName => $endpoint) {
            if (empty($endpoint['validation'])) continue;
            self::buildRequest($modelName, $endpointName, $endpoint, $slugNs, $name);
        }
    }

    private static function buildRequest(string $modelName, string $endpointName, array $endpoint, string $slugNs, string $tatSlug): void
    {
        $suffix      = ucfirst($endpointName);
        $requestName = "{$modelName}{$suffix}Request";
        // FIXED: Use $slugNs for file path
        $filePath    = app_path("Http/Requests/Arkzen/{$slugNs}/{$requestName}.php");

        $rules = self::generateRules($endpoint['validation']);

        $content = "<?php

// ============================================================
// ARKZEN GENERATED REQUEST — {$requestName}
// Tatemono: {$tatSlug}
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// ============================================================

namespace App\Http\Requests\Arkzen\\{$slugNs};

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
        Log::info("[Arkzen Request] ✓ Request created: {$slugNs}/{$requestName}");
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