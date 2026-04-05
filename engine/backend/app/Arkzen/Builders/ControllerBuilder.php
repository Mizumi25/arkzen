<?php

// ============================================================
// ARKZEN ENGINE — CONTROLLER BUILDER v5.4 (FIXED)
// FIXED: Now uses Resource class when resource: true is set
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class ControllerBuilder
{
    public static function build(array $module): void
    {
        $api            = $module['api'];
        $name           = $module['name'];                          // tatemono slug e.g. inventory-management
        $slugNs         = EventBuilder::toNamespace($name);        // e.g. InventoryManagement
        $controllerName = $api['controller'];
        $modelName      = $api['model'];
        $endpoints      = $api['endpoints'];
        $useResource    = $api['resource'] ?? false;               // ← ADD THIS
        
        // FIXED: Use $slugNs for directory (namespace-safe), not $name
        $filePath       = app_path("Http/Controllers/Arkzen/{$slugNs}/{$controllerName}.php");

        File::ensureDirectoryExists(app_path("Http/Controllers/Arkzen/{$slugNs}"));

        $methods = self::generateMethods($modelName, $endpoints, $slugNs, $useResource);  // ← ADD params

        $resourceImport = $useResource 
            ? "use App\\Http\\Resources\\Arkzen\\{$slugNs}\\{$modelName}Resource;\n" 
            : '';

        $content = "<?php

// ============================================================
// ARKZEN GENERATED CONTROLLER — {$controllerName}
// Tatemono: {$name}
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// ============================================================

namespace App\Http\Controllers\Arkzen\\{$slugNs};

use Illuminate\Routing\Controller;
use App\Models\Arkzen\\{$slugNs}\\{$modelName};
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
{$resourceImport}
class {$controllerName} extends Controller
{
{$methods}
}
";

        File::put($filePath, $content);
        Log::info("[Arkzen Controller] ✓ Controller created: {$slugNs}/{$controllerName}");
    }

    // ─────────────────────────────────────────────
    // GENERATE METHODS
    // ─────────────────────────────────────────────

    private static function generateMethods(string $modelName, array $endpoints, string $slugNs, bool $useResource): string
    {
        $methods = [];
        foreach ($endpoints as $name => $endpoint) {
            $methods[] = self::generateMethod($name, $modelName, $endpoint, $slugNs, $useResource);
        }
        return implode("\n\n", $methods);
    }

    private static function generateMethod(string $name, string $modelName, array $endpoint, string $slugNs, bool $useResource): string
    {
        return match ($name) {
            'index'   => self::generateIndex($modelName, $endpoint, $slugNs, $useResource),
            'show'    => self::generateShow($modelName, $endpoint, $slugNs, $useResource),
            'store'   => self::generateStore($modelName, $endpoint, $slugNs, $useResource),
            'update'  => self::generateUpdate($modelName, $endpoint, $slugNs, $useResource),
            'destroy' => self::generateDestroy($modelName, $endpoint),
            default   => self::generateCustomMethod($name, $modelName, $endpoint),
        };
    }

    // ─────────────────────────────────────────────
    // INDEX — FIXED to use Resource
    // ─────────────────────────────────────────────

    private static function generateIndex(string $model, array $endpoint, string $slugNs, bool $useResource): string
    {
        $query        = $endpoint['query'] ?? [];
        $searchFields = self::detectSearchFields($query);
        $perPage      = self::extractDefault($query['per_page'] ?? 'integer|default:15');
        $resourceClass = $useResource ? "{$model}Resource::class" : 'null';
        $resourceCollection = $useResource ? "{$model}Resource::collection" : '';

        $searchLogic = '';
        if ($searchFields) {
            $searchLogic = "\n        if (\$request->filled('search')) {\n            \$query->where(function (\$q) use (\$request) {\n                " . implode("\n                ", array_map(
                fn($f) => "\$q->orWhere('{$f}', 'like', '%' . \$request->search . '%');",
                $searchFields
            )) . "\n            });\n        }";
        }

        $filterLogic = self::generateFilterLogic($query);

        if ($useResource) {
            return "    /**
     * {$endpoint['description']}
     */
    public function index(Request \$request): JsonResponse
    {
        \$query = {$model}::query();
{$searchLogic}
{$filterLogic}
        \$perPage = \$request->get('per_page', {$perPage});
        \$results = \$query->paginate(\$perPage);

        return response()->json({$model}Resource::collection(\$results));
    }";
        }

        return "    /**
     * {$endpoint['description']}
     */
    public function index(Request \$request): JsonResponse
    {
        \$query = {$model}::query();
{$searchLogic}
{$filterLogic}
        \$perPage = \$request->get('per_page', {$perPage});
        \$results = \$query->paginate(\$perPage);

        return response()->json(\$results);
    }";
    }

    // ─────────────────────────────────────────────
    // SHOW — FIXED to use Resource
    // ─────────────────────────────────────────────

    private static function generateShow(string $model, array $endpoint, string $slugNs, bool $useResource): string
    {
        $varName = lcfirst($model);
        
        if ($useResource) {
            return "    /**
     * {$endpoint['description']}
     */
    public function show({$model} \${$varName}): JsonResponse
    {
        return response()->json(new {$model}Resource(\${$varName}));
    }";
        }

        return "    /**
     * {$endpoint['description']}
     */
    public function show({$model} \${$varName}): JsonResponse
    {
        return response()->json(\${$varName});
    }";
    }

    // ─────────────────────────────────────────────
    // STORE — FIXED to use Resource
    // ─────────────────────────────────────────────

    private static function generateStore(string $model, array $endpoint, string $slugNs, bool $useResource): string
    {
        $validation = self::generateValidation($endpoint['validation'] ?? []);
        $varName    = lcfirst($model);

        if ($useResource) {
            return "    /**
     * {$endpoint['description']}
     */
    public function store(Request \$request): JsonResponse
    {
        \$validated = \$request->validate([
{$validation}
        ]);

        \${$varName} = {$model}::create(\$validated);

        return response()->json(new {$model}Resource(\${$varName}), 201);
    }";
        }

        return "    /**
     * {$endpoint['description']}
     */
    public function store(Request \$request): JsonResponse
    {
        \$validated = \$request->validate([
{$validation}
        ]);

        \${$varName} = {$model}::create(\$validated);

        return response()->json(\${$varName}, 201);
    }";
    }

    // ─────────────────────────────────────────────
    // UPDATE — FIXED to use Resource
    // ─────────────────────────────────────────────

    private static function generateUpdate(string $model, array $endpoint, string $slugNs, bool $useResource): string
    {
        $validation = self::generateValidation($endpoint['validation'] ?? []);
        $varName    = lcfirst($model);

        if ($useResource) {
            return "    /**
     * {$endpoint['description']}
     */
    public function update(Request \$request, {$model} \${$varName}): JsonResponse
    {
        \$validated = \$request->validate([
{$validation}
        ]);

        \${$varName}->update(\$validated);

        return response()->json(new {$model}Resource(\${$varName}));
    }";
        }

        return "    /**
     * {$endpoint['description']}
     */
    public function update(Request \$request, {$model} \${$varName}): JsonResponse
    {
        \$validated = \$request->validate([
{$validation}
        ]);

        \${$varName}->update(\$validated);

        return response()->json(\${$varName});
    }";
    }

    // ─────────────────────────────────────────────
    // DESTROY — unchanged
    // ─────────────────────────────────────────────

    private static function generateDestroy(string $model, array $endpoint): string
    {
        $varName = lcfirst($model);
        $message = $endpoint['response']['value'] ?? "{$model} deleted successfully";

        return "    /**
     * {$endpoint['description']}
     */
    public function destroy({$model} \${$varName}): JsonResponse
    {
        \${$varName}->delete();

        return response()->json(['message' => '{$message}']);
    }";
    }

    // ─────────────────────────────────────────────
    // CUSTOM METHOD
    // ─────────────────────────────────────────────

    private static function generateCustomMethod(string $name, string $model, array $endpoint): string
    {
        return "    /**
     * {$endpoint['description']}
     */
    public function {$name}(Request \$request): JsonResponse
    {
        // Custom endpoint: {$name}
        // Implement logic here
        return response()->json(['message' => 'Not implemented']);
    }";
    }

    // ─────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────

    private static function generateValidation(array $rules): string
    {
        $lines = [];
        foreach ($rules as $field => $rule) {
            $lines[] = "            '{$field}' => '{$rule}'";
        }
        return implode(",\n", $lines);
    }

    private static function generateFilterLogic(array $query): string
    {
        $lines = [];
        foreach ($query as $param => $type) {
            if ($param === 'search' || $param === 'per_page') continue;
            $lines[] = "        if (\$request->filled('{$param}')) {\n            \$query->where('{$param}', \$request->{$param});\n        }";
        }
        return implode("\n", $lines);
    }

    private static function detectSearchFields(array $query): array
    {
        return isset($query['search']) ? ['name', 'description'] : [];
    }

    private static function extractDefault(string $definition): string
    {
        if (preg_match('/default:(\d+)/', $definition, $matches)) {
            return $matches[1];
        }
        return '15';
    }
}