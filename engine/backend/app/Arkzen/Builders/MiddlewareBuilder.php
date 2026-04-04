<?php

// ============================================================
// ARKZEN ENGINE — MIDDLEWARE BUILDER v5.1
//
// FIX: "auth:sanctum" was falling through to generateCustomMiddleware()
//   which produced Auth:sanctum.php — a file with a colon in its name
//   (illegal on Windows, invalid PHP class name). Sanctum middleware is
//   a Laravel built-in alias — it must never be stubbed as a file.
//
// The fix adds "auth:sanctum" and "auth" explicitly to $builtIn so
// resolve() maps them directly and never reaches generateCustomMiddleware().
//
// All built-in middleware strings are now normalised in one place.
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class MiddlewareBuilder
{
    // ─────────────────────────────────────────────
    // KNOWN BUILT-IN MIDDLEWARE
    // These are resolved directly by Laravel — no file needed.
    //
    // FIX: "auth:sanctum" is now listed here explicitly so it is
    //   never passed to generateCustomMiddleware().
    //   Previously only "auth" was listed; "auth:sanctum" written
    //   directly in a tatemono would slip through to the stub
    //   generator and produce the broken Auth:sanctum.php file.
    // ─────────────────────────────────────────────

    private static array $builtIn = [
        'auth'          => 'auth:sanctum',   // shorthand → Sanctum
        'auth:sanctum'  => 'auth:sanctum',   // FIX: explicit passthrough
        'throttle'      => 'throttle',
        'verified'      => 'verified',
        'cors'          => 'cors',
        'api'           => 'api',
        'web'           => 'web',
        'cache.headers' => 'cache.headers',
    ];

    // ─────────────────────────────────────────────
    // BUILD
    // Resolves middleware list and generates any custom ones.
    // Returns the final resolved middleware array for RouteRegistrar.
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
        // throttle:60,1 — pass through with params intact
        if (str_starts_with($mw, 'throttle')) {
            return $mw;
        }

        // role:admin — generate custom middleware if not exists
        if (str_starts_with($mw, 'role:')) {
            self::ensureRoleMiddleware();
            return $mw;
        }

        // FIX: check the full builtIn map BEFORE falling through.
        // This catches "auth:sanctum" (written directly in a tatemono)
        // as well as "auth" (shorthand). Neither should ever become a file.
        if (isset(self::$builtIn[$mw])) {
            return self::$builtIn[$mw];
        }

        // Unknown — generate a stub custom middleware.
        // This path is intentionally AFTER all built-in checks.
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
    // For any unrecognized middleware string.
    //
    // FIX: This method is now only reached AFTER all built-in checks
    //   pass, so "auth:sanctum" and friends can never reach here.
    //   The className derivation also sanitises colons and special
    //   characters so the generated filename is always valid.
    // ─────────────────────────────────────────────

    private static function generateCustomMiddleware(string $name): void
    {
        // Sanitise: strip anything that's not alphanumeric or hyphen/underscore
        // "auth:sanctum" → would become "Authsanctum" — but this path is
        // never reached for built-in middleware anymore (see resolve()).
        $safeName  = preg_replace('/[^a-zA-Z0-9\-_]/', '', $name);
        $className = str_replace(['-', '_'], '', ucwords($safeName, '-_'));

        if (empty($className)) {
            Log::warning("[Arkzen Middleware] ⚠ Could not derive class name for middleware: {$name} — skipping.");
            return;
        }

        $path = app_path("Http/Middleware/{$className}.php");

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