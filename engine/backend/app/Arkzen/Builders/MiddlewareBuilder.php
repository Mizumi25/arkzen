<?php

// ============================================================
// ARKZEN ENGINE — MIDDLEWARE BUILDER v7.0
//
// v7.0: Body injection + alias fix.
//
//   ALIAS BUG FIX:
//   Previously, only role:* middleware had its alias registered in the
//   route file. Custom middleware like 'requireJson' had a use statement
//   injected but NO aliasMiddleware() call — Laravel could not resolve
//   the string at runtime → 500. Now ALL generated custom middleware
//   returns an aliases map so RouteRegistrar registers them correctly.
//
//   BODY INJECTION:
//   build() now accepts $module['middlewareSnippets'] — a map of
//   middleware name → base64-encoded PHP handle() body. Passed from
//   ModuleReader which reads it from the parsed tatemono payload.
//   generateCustomMiddleware() decodes and injects the body instead of
//   the // TODO stub. Falls back to stub if no snippet provided.
//
//   DSL usage:
//     /* @arkzen:middleware:requireJson
//     */
//     if (!$request->isJson()) {
//         return response()->json(['message' => 'Content-Type: application/json required'], 415);
//     }
//     return $next($request);
//     /* @arkzen:middleware:requireJson:end */
//
// v6.0 (kept): Scoped all generated middleware under
//   app/Http/Middleware/Arkzen/{slugNs}/
//
// BUILT-IN MIDDLEWARE (no file generated):
//   auth, auth:sanctum, throttle, verified, cors, api, web, cache.headers
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class MiddlewareBuilder
{
    // ─────────────────────────────────────────────
    // KNOWN BUILT-IN MIDDLEWARE
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
    //
    // Returns:
    //   [
    //     'middleware' => ['api', 'auth:sanctum', 'requireJson'],
    //     'aliases'    => ['requireJson' => 'App\Http\Middleware\Arkzen\{slugNs}\RequireJson'],
    //     'useLines'   => ['use App\Http\Middleware\Arkzen\{slugNs}\RequireJson;'],
    //   ]
    // ─────────────────────────────────────────────

    public static function build(array $module): array
    {
        $declared        = $module['api']['middleware'] ?? [];
        $slugNs          = EventBuilder::toNamespace($module['name']);
        // v7.0: body snippets map (name → base64 PHP)
        $bodySnippets    = $module['middlewareSnippets'] ?? [];

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
            [$resolvedMw, $alias, $useLine] = self::resolve($mw, $slugNs, $bodySnippets);
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
    // ─────────────────────────────────────────────

    private static function resolve(string $mw, string $slugNs, array $bodySnippets): array
    {
        // throttle:60,1 — pass through with params intact
        if (str_starts_with($mw, 'throttle')) {
            return [$mw, null, null];
        }

        // role:admin — generate scoped CheckRole middleware
        if (str_starts_with($mw, 'role:')) {
            $fqcn     = self::ensureRoleMiddleware($slugNs);
            $aliases  = ['role' => $fqcn];
            $useLines = ["use {$fqcn};"];
            return [$mw, $aliases, $useLines];
        }

        // Known Laravel built-ins — resolve directly, no file
        if (isset(self::$builtIn[$mw])) {
            return [self::$builtIn[$mw], null, null];
        }

        // Unknown — generate a scoped custom middleware (with optional injected body)
        $body = isset($bodySnippets[$mw]) ? base64_decode($bodySnippets[$mw]) : null;
        [$resolvedMw, $fqcn, $alias] = self::generateCustomMiddleware($mw, $slugNs, $body);
        $useLines = $fqcn ? ["use {$fqcn};"] : [];
        // v7.0 FIX: always return alias for custom middleware so RouteRegistrar registers it
        return [$resolvedMw, $alias ?: null, $useLines ?: null];
    }

    // ─────────────────────────────────────────────
    // ENSURE ROLE MIDDLEWARE EXISTS (SCOPED)
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
    // GENERATE CUSTOM MIDDLEWARE (SCOPED)
    //
    // v7.0: Accepts optional $body (decoded PHP string).
    //       If provided, injects into handle() instead of stub.
    //       Always returns aliases map so RouteRegistrar can register.
    //
    // Returns [$middlewareString, $fqcn|null, $aliasMap|null]
    // ─────────────────────────────────────────────

    private static function generateCustomMiddleware(string $name, string $slugNs, ?string $body = null): array
    {
        $safeName  = preg_replace('/[^a-zA-Z0-9\-_]/', '', $name);
        $className = str_replace(['-', '_'], '', ucwords($safeName, '-_'));

        if (empty($className)) {
            Log::warning("[Arkzen Middleware] ⚠ Could not derive class name for middleware: {$name} — skipping.");
            return [$name, null, null];
        }

        $namespace = "App\\Http\\Middleware\\Arkzen\\{$slugNs}";
        $dir       = app_path("Http/Middleware/Arkzen/{$slugNs}");
        $path      = "{$dir}/{$className}.php";
        $fqcn      = "{$namespace}\\{$className}";
        $alias     = [$name => $fqcn];

        // If file already exists, skip writing but still return alias
        // so the route file alias registration is always emitted.
        if (File::exists($path)) {
            return [$name, $fqcn, $alias];
        }

        // Build handle() body — injected snippet or fallback stub
        if ($body && trim($body) !== '') {
            $handleBody = self::indentBody(trim($body));
            $bodyNote   = "Body injected from @arkzen:middleware:{$name} DSL block.";
        } else {
            $handleBody = "        // TODO: implement {$name} middleware logic\n        return \$next(\$request);";
            $bodyNote   = "No body provided in DSL — fill in handle() logic below.\n// To inject: add @arkzen:middleware:{$name} ... :end block to your tatemono.";
        }

        $content = <<<PHP
<?php

// ============================================================
// ARKZEN GENERATED MIDDLEWARE — {$className} [{$slugNs}]
// Scoped to this tatemono.
// {$bodyNote}
// ============================================================

namespace {$namespace};

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class {$className}
{
    public function handle(Request \$request, Closure \$next): Response
    {
{$handleBody}
    }
}
PHP;

        File::ensureDirectoryExists($dir);
        File::put($path, $content);
        Log::info("[Arkzen Middleware] ✓ Generated scoped middleware: Http/Middleware/Arkzen/{$slugNs}/{$className}.php");

        return [$name, $fqcn, $alias];
    }

    // ─────────────────────────────────────────────
    // INDENT BODY — re-indent injected PHP to 8 spaces (inside handle())
    // ─────────────────────────────────────────────

    private static function indentBody(string $body): string
    {
        $lines = explode("\n", $body);
        return implode("\n", array_map(fn($l) => '        ' . $l, $lines));
    }
}