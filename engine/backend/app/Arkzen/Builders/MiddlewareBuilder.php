<?php

// ============================================================
// ARKZEN ENGINE — MIDDLEWARE BUILDER v6.0
//
// v6.0: Scoped all generated middleware under
//   app/Http/Middleware/Arkzen/{slugNs}/
//   to match every other Arkzen builder's isolation convention.
//
//   Previously CheckRole and custom stubs were written to the
//   global app/Http/Middleware/ directory — shared across all
//   tatemonos and inconsistent with the rest of the engine.
//
//   Changes:
//   - ensureRoleMiddleware() now writes to
//       app/Http/Middleware/Arkzen/{slugNs}/CheckRole.php
//     with namespace App\Http\Middleware\Arkzen\{slugNs}
//   - generateCustomMiddleware() now writes to
//       app/Http/Middleware/Arkzen/{slugNs}/{Class}.php
//     with namespace App\Http\Middleware\Arkzen\{slugNs}
//   - build() now returns a $meta array alongside the resolved
//     middleware strings so RouteRegistrar can inject per-tatemono
//     alias registrations (e.g. 'role') at the top of the route
//     file — the same pattern used for Sanctum::usePersonalAccessTokenModel().
//
// BUILT-IN MIDDLEWARE (no file generated, unchanged):
//   auth, auth:sanctum, throttle, verified, cors, api, web, cache.headers
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class MiddlewareBuilder
{
    // ─────────────────────────────────────────────
    // KNOWN BUILT-IN MIDDLEWARE
    // These are resolved directly by Laravel — no file needed.
    // ─────────────────────────────────────────────

    private static array $builtIn = [
        'auth'          => 'auth:sanctum',
        'auth:sanctum'  => 'auth:sanctum',
        'throttle'      => 'throttle',
        'verified'      => 'verified',
        'cors'          => 'cors',
        'api'           => 'api',
        'web'           => 'web',
        'cache.headers' => 'cache.headers',
    ];

    // ─────────────────────────────────────────────
    // BUILD
    // Resolves middleware list, generates scoped files for any
    // non-built-in middleware, and returns both the resolved
    // middleware strings and alias registrations needed in the
    // route file.
    //
    // Returns:
    //   [
    //     'middleware' => ['api', 'auth:sanctum', 'role'],   // for Route::middleware()
    //     'aliases'    => ['role' => 'App\Http\Middleware\Arkzen\{slugNs}\CheckRole'],
    //     'useLines'   => ['use App\Http\Middleware\Arkzen\{slugNs}\CheckRole;'],
    //   ]
    // ─────────────────────────────────────────────

    public static function build(array $module): array
    {
        $declared = $module['api']['middleware'] ?? [];
        $slugNs   = EventBuilder::toNamespace($module['name']);

        if (empty($declared)) {
            Log::info("[Arkzen Middleware] No middleware declared — routes will be public.");
            return [
                'middleware' => ['api'],
                'aliases'    => [],
                'useLines'   => [],
            ];
        }

        $resolved = ['api'];
        $aliases  = [];
        $useLines = [];

        foreach ($declared as $mw) {
            [$resolvedMw, $alias, $useLine] = self::resolve($mw, $slugNs);
            $resolved[] = $resolvedMw;

            if ($alias) {
                $aliases  = array_merge($aliases, $alias);
            }
            if ($useLine) {
                $useLines = array_merge($useLines, $useLine);
            }
        }

        Log::info("[Arkzen Middleware] ✓ Resolved middleware: " . implode(', ', $resolved));

        return [
            'middleware' => $resolved,
            'aliases'    => $aliases,
            'useLines'   => array_unique($useLines),
        ];
    }

    // ─────────────────────────────────────────────
    // RESOLVE SINGLE MIDDLEWARE ENTRY
    //
    // Returns: [resolvedString, aliasMap|null, useLines|null]
    // ─────────────────────────────────────────────

    private static function resolve(string $mw, string $slugNs): array
    {
        // throttle:60,1 — pass through with params intact
        if (str_starts_with($mw, 'throttle')) {
            return [$mw, null, null];
        }

        // role:admin — generate scoped CheckRole middleware
        if (str_starts_with($mw, 'role:')) {
            $fqcn    = self::ensureRoleMiddleware($slugNs);
            $aliases = ['role' => $fqcn];
            $useLines = ["use {$fqcn};"];
            return [$mw, $aliases, $useLines];
        }

        // Known Laravel built-ins — resolve directly, no file
        if (isset(self::$builtIn[$mw])) {
            return [self::$builtIn[$mw], null, null];
        }

        // Unknown — generate a scoped custom middleware stub
        [$resolvedMw, $fqcn] = self::generateCustomMiddleware($mw, $slugNs);
        $useLines = $fqcn ? ["use {$fqcn};"] : [];
        return [$resolvedMw, null, $useLines ?: null];
    }

    // ─────────────────────────────────────────────
    // ENSURE ROLE MIDDLEWARE EXISTS (SCOPED)
    //
    // Previously: app/Http/Middleware/CheckRole.php (global, shared)
    // Now:        app/Http/Middleware/Arkzen/{slugNs}/CheckRole.php
    //
    // Returns the fully qualified class name so RouteRegistrar
    // can register the 'role' alias in the route file.
    // ─────────────────────────────────────────────

    private static function ensureRoleMiddleware(string $slugNs): string
    {
        $namespace = "App\\Http\\Middleware\\Arkzen\\{$slugNs}";
        $dir       = app_path("Http/Middleware/Arkzen/{$slugNs}");
        $path      = "{$dir}/CheckRole.php";

        if (File::exists($path)) {
            return "{$namespace}\\CheckRole";
        }

        $content = <<<PHP
<?php

// ============================================================
// ARKZEN GENERATED MIDDLEWARE — CheckRole [{$slugNs}]
// Scoped to this tatemono. Checks if the authenticated user
// has a required role.
// Usage in tatemono: middleware: [auth, role:admin]
// Requires: the tatemono's users table to have a `role` column.
// ============================================================

namespace {$namespace};

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    public function handle(Request \$request, Closure \$next, string ...\$roles): Response
    {
        \$user = \$request->user();

        if (!\$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if (!in_array(\$user->role, \$roles)) {
            return response()->json(['message' => 'Forbidden. Insufficient role.'], 403);
        }

        return \$next(\$request);
    }
}
PHP;

        File::ensureDirectoryExists($dir);
        File::put($path, $content);
        Log::info("[Arkzen Middleware] ✓ Generated scoped CheckRole: Http/Middleware/Arkzen/{$slugNs}/CheckRole.php");

        return "{$namespace}\\CheckRole";
    }

    // ─────────────────────────────────────────────
    // GENERATE CUSTOM MIDDLEWARE STUB (SCOPED)
    //
    // Previously: app/Http/Middleware/{Class}.php (global)
    // Now:        app/Http/Middleware/Arkzen/{slugNs}/{Class}.php
    //
    // Returns [middlewareString, fqcn|null]
    // ─────────────────────────────────────────────

    private static function generateCustomMiddleware(string $name, string $slugNs): array
    {
        $safeName  = preg_replace('/[^a-zA-Z0-9\-_]/', '', $name);
        $className = str_replace(['-', '_'], '', ucwords($safeName, '-_'));

        if (empty($className)) {
            Log::warning("[Arkzen Middleware] ⚠ Could not derive class name for middleware: {$name} — skipping.");
            return [$name, null];
        }

        $namespace = "App\\Http\\Middleware\\Arkzen\\{$slugNs}";
        $dir       = app_path("Http/Middleware/Arkzen/{$slugNs}");
        $path      = "{$dir}/{$className}.php";

        if (File::exists($path)) {
            return [$name, "{$namespace}\\{$className}"];
        }

        $content = <<<PHP
<?php

// ============================================================
// ARKZEN GENERATED MIDDLEWARE STUB — {$className} [{$slugNs}]
// Scoped to this tatemono. Declared in the tatemono DSL but
// not a known built-in. Fill in your logic below.
// ============================================================

namespace {$namespace};

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class {$className}
{
    public function handle(Request \$request, Closure \$next): Response
    {
        // TODO: implement {$name} middleware logic
        return \$next(\$request);
    }
}
PHP;

        File::ensureDirectoryExists($dir);
        File::put($path, $content);
        Log::info("[Arkzen Middleware] ✓ Generated scoped stub middleware: Http/Middleware/Arkzen/{$slugNs}/{$className}.php");

        return [$name, "{$namespace}\\{$className}"];
    }
}