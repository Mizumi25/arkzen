<?php

// ============================================================
// ARKZEN ENGINE — ROUTE REGISTRAR v5.0
//
// v5.0: Consumes new MiddlewareBuilder::build() return shape.
//       MiddlewareBuilder now returns an array with three keys:
//         - middleware: resolved middleware strings
//         - aliases:    per-tatemono middleware alias map
//                       e.g. ['role' => 'App\Http\Middleware\Arkzen\{slugNs}\CheckRole']
//         - useLines:   use statements for scoped middleware classes
//       Aliases are injected into the route file as a
//       Route::aliasMiddleware() block — same pattern as the
//       Sanctum::usePersonalAccessTokenModel() bootstrap.
//       This keeps middleware fully scoped per-tatemono with no
//       global app.php registration required.
//
// v4.6 (kept): Custom routes support added.
// v4.5 (kept): Sanctum token model bootstrap per route file.
// v4.4 (kept): Route parameters rewritten {id} → {modelVar}.
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

        $routeFile       = "{$routesDir}/{$name}.php";
        $useStatements   = [];
        $routeGroups     = [];
        $allAliases      = [];   // collected across all APIs: ['role' => FQCN, ...]
        $middlewareUses  = [];   // collected use lines for scoped middleware classes

        // ── Resource API routes ───────────────────
        foreach ($apis as $api) {
            $controllerName = $api['controller'];
            $prefix         = $api['prefix'];

            $useStatements[] = "use App\\Http\\Controllers\\Arkzen\\{$slugNs}\\{$controllerName};";

            // v5.0: build() now returns ['middleware', 'aliases', 'useLines']
            $mwResult = MiddlewareBuilder::build([
                'api'                => $api,
                'name'               => $name,
                'databases'          => $module['databases'],
                'apis'               => $apis,
                'middlewareSnippets' => $module['middlewareSnippets'] ?? [],
            ]);

            $resolvedMiddleware = $mwResult['middleware'];
            $middlewareStr      = "['" . implode("', '", $resolvedMiddleware) . "']";
            $routeLines         = self::generateRouteLines($controllerName, $api['endpoints'], $api['model']);

            // Collect aliases and use lines from this API
            if (!empty($mwResult['aliases'])) {
                $allAliases = array_merge($allAliases, $mwResult['aliases']);
            }
            if (!empty($mwResult['useLines'])) {
                $middlewareUses = array_merge($middlewareUses, $mwResult['useLines']);
            }

            $routeGroups[] = "// ── {$api['model']} ─────────────────────────────\n"
                . "Route::middleware({$middlewareStr})\n"
                . "    ->prefix('{$prefix}')\n"
                . "    ->group(function () {\n\n"
                . "{$routeLines}\n"
                . "    });";
        }

        // ── Custom routes — v4.6 ─────────────────
        foreach (($module['customRoutes'] ?? []) as $cr) {
            $controllerName  = $cr['controller'];
            $useStatements[] = "use App\\Http\\Controllers\\Arkzen\\{$slugNs}\\{$controllerName};";

            $middleware    = !empty($cr['middleware']) ? $cr['middleware'] : ['api'];
            $middlewareStr = "['" . implode("', '", $middleware) . "']";

            $lines = [];
            foreach ($cr['routes'] as $r) {
                $httpMethod = strtolower($r['method']);
                $route      = ltrim($r['route'], '/');
                $handler    = $r['handler'];
                $lines[]    = "        Route::{$httpMethod}('{$route}', [{$controllerName}::class, '{$handler}']);";
            }

            $linesBlock    = implode("\n", $lines);
            $routeGroups[] = "// ── Custom: {$controllerName} ─────────────────────────────\n"
                . "Route::middleware({$middlewareStr})\n"
                . "    ->group(function () {\n"
                . "{$linesBlock}\n"
                . "    });";
        }

        // ── Assemble use block ────────────────────
        // Controller use statements + scoped middleware use statements
        $allUseStatements = array_unique(array_merge($useStatements, $middlewareUses));
        $useBlock         = implode("\n", $allUseStatements);
        $groupsBlock      = implode("\n\n", $routeGroups);

        // ── Sanctum bootstrap (auth:true tatemonos) ───────────────
        // Swaps the token model so auth:sanctum resolves against the
        // tatemono's own isolated SQLite connection.
        $sanctumBootstrap = '';
        if ($hasAuth) {
            $sanctumBootstrap = "\nuse Laravel\\Sanctum\\Sanctum;\n"
                . "use App\\Models\\Arkzen\\{$slugNs}\\PersonalAccessToken as {$slugNs}Token;\n\n"
                . "Sanctum::usePersonalAccessTokenModel({$slugNs}Token::class);\n";
        }

        // ── Scoped middleware alias bootstrap ─────────────────────
        // Registers per-tatemono middleware aliases (e.g. 'role') directly
        // in the route file so no global app.php registration is needed.
        // This is the same localised-bootstrap pattern as Sanctum above.
        $aliasBootstrap = '';
        if (!empty($allAliases)) {
            $aliasLines = [];
            foreach ($allAliases as $aliasKey => $fqcn) {
                // aliasMiddleware($name, $class) takes two separate args — not an array
                $aliasLines[] = "app('router')->aliasMiddleware('{$aliasKey}', \\{$fqcn}::class);";
            }
            $aliasBootstrap = "\n// ── Scoped middleware aliases for this tatemono ────────────\n"
                . implode("\n", $aliasLines) . "\n";
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
{$sanctumBootstrap}{$aliasBootstrap}
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