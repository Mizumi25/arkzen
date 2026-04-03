<?php

// ============================================================
// ARKZEN ENGINE — MIDDLEWARE BUILDER
// Reads middleware declarations from @arkzen:api and
// generates or configures Laravel middleware accordingly.
//
// Supported built-in middleware aliases:
//   auth        → requires valid Sanctum token
//   throttle    → rate limiting (uses throttle config)
//   verified    → requires email verified
//   role:X      → requires user to have role X (custom)
//
// Usage in tatemono @arkzen:api:
//   middleware: [auth, throttle:60,1]
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class MiddlewareBuilder
{
    // ─────────────────────────────────────────────
    // KNOWN BUILT-IN MIDDLEWARE
    // These are resolved directly by Laravel — no file needed
    // ─────────────────────────────────────────────

    private static array $builtIn = [
        'auth'      => 'auth:sanctum',
        'throttle'  => 'throttle',
        'verified'  => 'verified',
        'cors'      => 'cors',
    ];

    // ─────────────────────────────────────────────
    // BUILD
    // Resolves middleware list and generates any custom ones
    // Returns the final resolved middleware array for RouteRegistrar
    // ─────────────────────────────────────────────

    public static function build(array $module): array
    {
        $declared = $module['api']['middleware'] ?? [];

        if (empty($declared)) {
            Log::info("[Arkzen Middleware] No middleware declared — routes will be public.");
            return ['api'];
        }

        $resolved = ['api'];

        foreach ($declared as $mw) {
            $resolved[] = self::resolve($mw, $module);
        }

        Log::info("[Arkzen Middleware] ✓ Resolved middleware: " . implode(', ', $resolved));
        return $resolved;
    }

    // ─────────────────────────────────────────────
    // RESOLVE SINGLE MIDDLEWARE ENTRY
    // ─────────────────────────────────────────────

    private static function resolve(string $mw, array $module): string
    {
        // throttle:60,1 — pass through with params
        if (str_starts_with($mw, 'throttle')) {
            return $mw;
        }

        // role:admin — generate custom middleware if not exists
        if (str_starts_with($mw, 'role:')) {
            self::ensureRoleMiddleware();
            return $mw;
        }

        // auth — map to sanctum
        if ($mw === 'auth') {
            return 'auth:sanctum';
        }

        // Known built-in — map it
        if (isset(self::$builtIn[$mw])) {
            return self::$builtIn[$mw];
        }

        // Unknown — generate a stub custom middleware
        self::generateCustomMiddleware($mw);
        return $mw;
    }

    // ─────────────────────────────────────────────
    // ENSURE ROLE MIDDLEWARE EXISTS
    // Generated once, reused for all tatemonos
    // ─────────────────────────────────────────────

    private static function ensureRoleMiddleware(): void
    {
        $path = app_path('Http/Middleware/CheckRole.php');

        if (File::exists($path)) {
            return;
        }

        $content = <<<'PHP'
<?php

// ============================================================
// ARKZEN GENERATED MIDDLEWARE — CheckRole
// Checks if the authenticated user has a required role.
// Usage in tatemono: middleware: [auth, role:admin]
// Requires: users table to have a `role` string column
// ============================================================

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if (!in_array($user->role, $roles)) {
            return response()->json(['message' => 'Forbidden. Insufficient role.'], 403);
        }

        return $next($request);
    }
}
PHP;

        File::ensureDirectoryExists(app_path('Http/Middleware'));
        File::put($path, $content);
        Log::info("[Arkzen Middleware] ✓ Generated CheckRole middleware");

        // Register alias in bootstrap/app.php note — developer must add:
        // ->withMiddleware(fn($m) => $m->alias(['role' => \App\Http\Middleware\CheckRole::class]))
        // Arkzen setup.js handles this automatically via fixAppPhp()
    }

    // ─────────────────────────────────────────────
    // GENERATE CUSTOM MIDDLEWARE STUB
    // For any unrecognized middleware string
    // ─────────────────────────────────────────────

    private static function generateCustomMiddleware(string $name): void
    {
        $className = str_replace('-', '', ucwords($name, '-'));
        $path      = app_path("Http/Middleware/{$className}.php");

        if (File::exists($path)) {
            return;
        }

        $content = <<<PHP
<?php

// ============================================================
// ARKZEN GENERATED MIDDLEWARE STUB — {$className}
// This was declared in a tatemono but is not a built-in.
// Fill in your logic below.
// ============================================================

namespace App\Http\Middleware;

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

        File::ensureDirectoryExists(app_path('Http/Middleware'));
        File::put($path, $content);
        Log::info("[Arkzen Middleware] ✓ Generated stub middleware: {$className}");
    }
}