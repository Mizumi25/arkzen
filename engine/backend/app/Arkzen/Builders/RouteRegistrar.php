<?php

// ============================================================
// ARKZEN ENGINE — ROUTE REGISTRAR v4.1
// Fixed: ->prefix($api['prefix']) now applied per resource group
// One route file per tatemono, containing ALL resource groups.
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use App\Providers\Arkzen\ArkzenServiceProvider;

class RouteRegistrar
{
    // ─────────────────────────────────────────────
    // BUILD ALL — one file, all resources
    // ─────────────────────────────────────────────

    public static function buildAll(array $module): void
    {
        $name      = $module['name'];
        $apis      = $module['apis'];
        $routesDir = base_path('routes/modules');

        File::ensureDirectoryExists($routesDir);

        $routeFile = "{$routesDir}/{$name}.php";

        // Collect all controller use statements
        $useStatements = [];
        $routeGroups   = [];

        foreach ($apis as $api) {
            $controllerName = $api['controller'];
            $prefix         = $api['prefix'];

            $useStatements[] = "use App\\Http\\Controllers\\Arkzen\\{$name}\\{$controllerName};";

            $resolvedMiddleware = MiddlewareBuilder::build(['api' => $api, 'name' => $name, 'databases' => $module['databases'], 'apis' => $apis]);
            $middlewareStr      = "['" . implode("', '", $resolvedMiddleware) . "']";
            $routeLines         = self::generateRouteLines($controllerName, $api['endpoints']);

            $routeGroups[] = "// ── {$api['model']} ─────────────────────────────\nRoute::middleware({$middlewareStr})\n    ->prefix('{$prefix}')\n    ->group(function () {\n\n{$routeLines}\n    });";
        }

        $useBlock    = implode("\n", array_unique($useStatements));
        $groupsBlock = implode("\n\n", $routeGroups);

        $content = "<?php

// ============================================================
// ARKZEN GENERATED ROUTES — {$name}
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// Resources: " . implode(', ', array_column($apis, 'model')) . "
// ============================================================

use Illuminate\\Support\\Facades\\Route;
{$useBlock}

{$groupsBlock}
";

        File::put($routeFile, $content);
        Log::info("[Arkzen Routes] ✓ Route file created: routes/modules/{$name}.php");

        ArkzenServiceProvider::registerModuleRoutes($name);
        Log::info("[Arkzen Routes] ✓ Routes registered for: {$name}");
    }

    // ─────────────────────────────────────────────
    // GENERATE ROUTE LINES FOR ONE RESOURCE
    // ─────────────────────────────────────────────

    private static function generateRouteLines(string $controller, array $endpoints): string
    {
        $lines = [];

        $methodMap = [
            'GET'    => 'get',
            'POST'   => 'post',
            'PUT'    => 'put',
            'PATCH'  => 'patch',
            'DELETE' => 'delete',
        ];

        foreach ($endpoints as $name => $endpoint) {
            $httpMethod  = strtoupper($endpoint['method']);
            $routeMethod = $methodMap[$httpMethod] ?? 'get';
            $route       = $endpoint['route'];
            $description = $endpoint['description'] ?? $name;

            $lines[] = "        // {$description}";
            $lines[] = "        Route::{$routeMethod}('{$route}', [{$controller}::class, '{$name}']);";
            $lines[] = '';
        }

        return implode("\n", $lines);
    }

    // ─────────────────────────────────────────────
    // REMOVE
    // ─────────────────────────────────────────────

    public static function remove(string $moduleName): void
    {
        $routeFile = base_path("routes/modules/{$moduleName}.php");

        if (File::exists($routeFile)) {
            File::delete($routeFile);
            Log::info("[Arkzen Routes] ✓ Route file removed: {$moduleName}");
        }
    }
}