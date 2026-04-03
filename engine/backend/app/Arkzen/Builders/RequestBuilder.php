<?php

// ============================================================
// ARKZEN ENGINE — REQUEST BUILDER
// Generates Laravel Form Request classes.
// Moves validation out of controllers into dedicated classes.
// One Request class per endpoint that has validation rules.
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class RequestBuilder
{
    public static function build(array $module): void
    {
        $api       = $module['api'];
        $modelName = $api['model'];
        $endpoints = $api['endpoints'] ?? [];

        File::ensureDirectoryExists(app_path('Http/Requests/Arkzen'));

        foreach ($endpoints as $endpointName => $endpoint) {
            if (empty($endpoint['validation'])) continue;

            self::buildRequest($modelName, $endpointName, $endpoint);
        }
    }

    // ─────────────────────────────────────────────
    // BUILD SINGLE REQUEST
    // ─────────────────────────────────────────────

    private static function buildRequest(string $modelName, string $endpointName, array $endpoint): void
    {
        $suffix      = ucfirst($endpointName); // store → Store, update → Update
        $requestName = "{$modelName}{$suffix}Request";
        $filePath    = app_path("Http/Requests/Arkzen/{$requestName}.php");

        $rules = self::generateRules($endpoint['validation']);

        $content = "<?php

// ============================================================
// ARKZEN GENERATED REQUEST — {$requestName}
// Validates {$endpointName} requests for {$modelName}.
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// ============================================================

namespace App\Http\Requests\Arkzen;

use Illuminate\Foundation\Http\FormRequest;

class {$requestName} extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization handled by middleware
    }

    public function rules(): array
    {
        return [
{$rules}
        ];
    }

    public function messages(): array
    {
        return [];
    }
}
";

        File::put($filePath, $content);
        Log::info("[Arkzen Request] ✓ Request created: {$requestName}");
    }

    // ─────────────────────────────────────────────
    // GENERATE RULES
    // ─────────────────────────────────────────────

    private static function generateRules(array $validation): string
    {
        $lines = [];
        foreach ($validation as $field => $rule) {
            $lines[] = "            '{$field}' => '{$rule}',";
        }
        return implode("\n", $lines);
    }
}