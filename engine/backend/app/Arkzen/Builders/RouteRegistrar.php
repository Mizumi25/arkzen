<?php

// ============================================================
// ARKZEN ENGINE — ROUTE REGISTRAR v4.5
// FIXED v4.4: Route parameters rewritten from {id} to {modelVar}
//   so Laravel implicit model binding always works correctly.
//   e.g. /items/{id} → /items/{item} for Item model
// FIXED v4.5: auth:true tatemonos now emit a Sanctum::usePersonalAccessTokenModel()
//   call at the top of their generated route file. Without this, auth:sanctum
//   middleware on non-auth routes (promote, demote, adminOnly etc.) resolves
//   tokens against the global default connection — missing the tatemono's
//   isolated SQLite — and returns 401 Unauthenticated even for valid tokens.
//   The call is injected once per route file, before any middleware groups.
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
        $slugNs    = EventBuilder::toNamespace($name);             // inventory-management → InventoryManagement
        $hasAuth   = $module['auth'] ?? false;
        $apis      = $module['apis'];
        $routesDir = base_path('routes/modules');

        File::ensureDirectoryExists($routesDir);

        $routeFile     = "{$routesDir}/{$name}.php";
        $useStatements = [];
        $routeGroups   = [];

        foreach ($apis as $api) {
            $controllerName = $api['controller'];
            $prefix         = $api['prefix'];

            $useStatements[] = "use App\\Http\\Controllers\\Arkzen\\{$slugNs}\\{$controllerName};";

            $resolvedMiddleware = MiddlewareBuilder::build(['api' => $api, 'name' => $name, 'databases' => $module['databases'], 'apis' => $apis]);
            $middlewareStr      = "['" . implode("', '", $resolvedMiddleware) . "']";
            $routeLines         = self::generateRouteLines($controllerName, $api['endpoints'], $api['model']);

            $routeGroups[] = "// ── {$api['model']} ─────────────────────────────\nRoute::middleware({$middlewareStr})\n    ->prefix('{$prefix}')\n    ->group(function () {\n\n{$routeLines}\n    });";
        }

        $useBlock    = implode("\n", array_unique($useStatements));
        $groupsBlock = implode("\n\n", $routeGroups);

        // For auth:true tatemonos, swap the Sanctum token model at the top of the
        // route file so auth:sanctum middleware resolves tokens against the tatemono's
        // own isolated SQLite connection — not the global default connection.
        // Without this, tokens written by AuthController are invisible to auth:sanctum
        // on all other routes, producing 401 Unauthenticated for valid tokens.
        $sanctumBootstrap = '';
        if ($hasAuth) {
            $sanctumBootstrap = "\nuse Laravel\\Sanctum\\Sanctum;\nuse App\\Models\\Arkzen\\{$slugNs}\\PersonalAccessToken as {$slugNs}Token;\n\nSanctum::usePersonalAccessTokenModel({$slugNs}Token::class);\n";
        }

        $content = "<?php

// ============================================================
// ARKZEN GENERATED ROUTES — {$name}
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// Resources: " . implode(', ', array_column($apis, 'model')) . "
// ============================================================

use Illuminate\\Support\\Facades\\Route;
{$useBlock}
{$sanctumBootstrap}
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

    private static function generateRouteLines(string $controller, array $endpoints, string $model): string
    {
        $lines    = [];
        $modelVar = lcfirst($model); // Item → item, EventLog → eventLog

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
            $route       = preg_replace('/\{id\}/', '{' . $modelVar . '}', $endpoint['route']);
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