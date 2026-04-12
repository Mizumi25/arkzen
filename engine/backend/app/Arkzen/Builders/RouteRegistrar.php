<?php

// ============================================================
// ARKZEN ENGINE — ROUTE REGISTRAR v4.6
// v4.6: Custom routes support added.
//       @arkzen:routes blocks generate route entries in the
//       same route file as resource routes, after all resource
//       groups. Each custom route block becomes a separate
//       Route::middleware()->group() entry so middleware is
//       applied correctly per block.
//
// FIXED v4.5 (kept): auth:true tatemonos now emit a
//   Sanctum::usePersonalAccessTokenModel() call at the top of
//   their generated route file.
//
// FIXED v4.4 (kept): Route parameters rewritten from {id} to
//   {modelVar} so Laravel implicit model binding works correctly.
//   e.g. /items/{id} → /items/{item} for Item model
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use App\Providers\Arkzen\ArkzenServiceProvider;

class RouteRegistrar
{
    // ─────────────────────────────────────────────
    // BUILD ALL — one file, all resources + custom routes
    // ─────────────────────────────────────────────

    public static function buildAll(array $module): void
    {
        $name      = $module['name'];
        $slugNs    = EventBuilder::toNamespace($name);
        $hasAuth   = $module['auth'] ?? false;
        $apis      = $module['apis'];
        $routesDir = base_path('routes/modules');

        File::ensureDirectoryExists($routesDir);

        $routeFile     = "{$routesDir}/{$name}.php";
        $useStatements = [];
        $routeGroups   = [];

        // ── Resource API routes ───────────────────
        foreach ($apis as $api) {
            $controllerName = $api['controller'];
            $prefix         = $api['prefix'];

            $useStatements[] = "use App\\Http\\Controllers\\Arkzen\\{$slugNs}\\{$controllerName};";

            $resolvedMiddleware = MiddlewareBuilder::build([
                'api'       => $api,
                'name'      => $name,
                'databases' => $module['databases'],
                'apis'      => $apis,
            ]);
            $middlewareStr = "['" . implode("', '", $resolvedMiddleware) . "']";
            $routeLines    = self::generateRouteLines($controllerName, $api['endpoints'], $api['model']);

            $routeGroups[] = "// ── {$api['model']} ─────────────────────────────\n"
                . "Route::middleware({$middlewareStr})\n"
                . "    ->prefix('{$prefix}')\n"
                . "    ->group(function () {\n\n"
                . "{$routeLines}\n"
                . "    });";
        }

        // ── Custom routes — v4.6 ─────────────────
        // Generated after resource routes. Each @arkzen:routes block
        // becomes its own middleware group so per-block middleware is
        // honoured correctly. No prefix is applied — the full route path
        // is declared in the tatemono as-is (e.g. /api/errors-test/simulate/{code}).
        foreach (($module['customRoutes'] ?? []) as $cr) {
            $controllerName  = $cr['controller'];
            $useStatements[] = "use App\\Http\\Controllers\\Arkzen\\{$slugNs}\\{$controllerName};";

            // Default to ['api'] middleware if none declared
            $middleware    = !empty($cr['middleware']) ? $cr['middleware'] : ['api'];
            $middlewareStr = "['" . implode("', '", $middleware) . "']";

            $lines = [];
            foreach ($cr['routes'] as $r) {
                $httpMethod  = strtolower($r['method']);
                $route       = ltrim($r['route'], '/');
                $handler     = $r['handler'];
                $lines[]     = "        Route::{$httpMethod}('{$route}', [{$controllerName}::class, '{$handler}']);";
            }

            $linesBlock    = implode("\n", $lines);
            $routeGroups[] = "// ── Custom: {$controllerName} ─────────────────────────────\n"
                . "Route::middleware({$middlewareStr})\n"
                . "    ->group(function () {\n"
                . "{$linesBlock}\n"
                . "    });";
        }

        $useBlock    = implode("\n", array_unique($useStatements));
        $groupsBlock = implode("\n\n", $routeGroups);

        // For auth:true tatemonos, swap the Sanctum token model at the top of the
        // route file so auth:sanctum middleware resolves tokens against the tatemono's
        // own isolated SQLite connection — not the global default connection.
        $sanctumBootstrap = '';
        if ($hasAuth) {
            $sanctumBootstrap = "\nuse Laravel\\Sanctum\\Sanctum;\n"
                . "use App\\Models\\Arkzen\\{$slugNs}\\PersonalAccessToken as {$slugNs}Token;\n\n"
                . "Sanctum::usePersonalAccessTokenModel({$slugNs}Token::class);\n";
        }

        $content = "<?php

// ============================================================
// ARKZEN GENERATED ROUTES — {$name}
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// Resources: " . implode(', ', array_column($apis, 'model')) . "
// Custom controllers: " . implode(', ', array_column($module['customRoutes'] ?? [], 'controller')) . "
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