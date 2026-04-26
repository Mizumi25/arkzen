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
        $validationContext = self::buildValidationContext($module);

        // FIXED: Use $slugNs for directory
        File::ensureDirectoryExists(app_path("Http/Requests/Arkzen/{$slugNs}"));

        foreach ($endpoints as $endpointName => $endpoint) {
            if (empty($endpoint['validation'])) continue;
            self::buildRequest($modelName, $endpointName, $endpoint, $slugNs, $name, $validationContext);
        }
    }

    private static function buildRequest(string $modelName, string $endpointName, array $endpoint, string $slugNs, string $tatSlug, array $validationContext): void
    {
        $suffix      = ucfirst($endpointName);
        $requestName = "{$modelName}{$suffix}Request";
        // FIXED: Use $slugNs for file path
        $filePath    = app_path("Http/Requests/Arkzen/{$slugNs}/{$requestName}.php");

        $rules = self::generateRules($endpoint['validation'], $validationContext);

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

    private static function generateRules(array $validation, array $validationContext): string
    {
        $lines = [];
        foreach ($validation as $field => $rule) {
            $normalizedRule = self::normalizeValidationRule((string) $rule, $validationContext);
            $lines[] = "            '{$field}' => '{$normalizedRule}',";
        }
        return implode("\n", $lines);
    }

    private static function normalizeValidationRule(string $rule, array $context): string
    {
        if ($rule === '') return $rule;

        $segments = explode('|', $rule);
        foreach ($segments as &$segment) {
            if (!str_starts_with($segment, 'unique:') && !str_starts_with($segment, 'exists:')) {
                continue;
            }

            [$keyword, $params] = explode(':', $segment, 2);
            $parts = explode(',', $params);
            $table = trim($parts[0] ?? '');

            if ($table === '' || str_contains($table, '.')) {
                continue;
            }

            $resolvedTable = self::resolveValidationTable($table, $context);
            $connection = $context['connection'] ?? '';
            if ($resolvedTable === null || $connection === '') {
                continue;
            }

            $parts[0] = $connection . '.' . $resolvedTable;
            $segment = $keyword . ':' . implode(',', $parts);
        }
        unset($segment);

        return implode('|', $segments);
    }

    private static function resolveValidationTable(string $table, array $context): ?string
    {
        $tables = $context['tables'] ?? [];
        if (in_array($table, $tables, true)) {
            return $table;
        }

        $tatSlug = $context['tatemono'] ?? '';
        if ($tatSlug === '') return null;

        $prefixed = ModelBuilder::prefixedTable($tatSlug, $table);
        return in_array($prefixed, $tables, true) ? $prefixed : null;
    }

    private static function buildValidationContext(array $module): array
    {
        $tatSlug = $module['name'] ?? '';
        $tables = [];

        if ($tatSlug !== '') {
            if (!empty($module['database']['table'])) {
                $tables[] = ModelBuilder::prefixedTable($tatSlug, $module['database']['table']);
            }

            foreach (($module['databases'] ?? []) as $db) {
                if (!empty($db['table'])) {
                    $tables[] = ModelBuilder::prefixedTable($tatSlug, $db['table']);
                }
            }
        }

        return [
            'tatemono'   => $tatSlug,
            'connection' => $tatSlug !== '' ? ModelBuilder::slugToConnection($tatSlug) : '',
            'tables'     => array_values(array_unique($tables)),
        ];
    }
}
