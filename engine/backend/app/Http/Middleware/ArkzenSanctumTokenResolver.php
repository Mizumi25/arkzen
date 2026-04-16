<?php

// ============================================================
// ARKZEN ENGINE — SANCTUM TOKEN RESOLVER MIDDLEWARE
//
// ROOT CAUSE FIX for 401 Unauthenticated on auth:sanctum routes.
//
// The problem: Sanctum::usePersonalAccessTokenModel() inside
// controller methods fires AFTER the auth:sanctum middleware has
// already attempted token lookup using the default (wrong) model.
// The middleware finds no token → returns 401 before the
// controller even runs.
//
// The fix: This middleware runs BEFORE auth:sanctum (prepended
// in bootstrap/app.php). It reads the URL prefix, looks up the
// tatemono slug from the registry, resolves the correct
// PersonalAccessToken model class, and calls
// Sanctum::usePersonalAccessTokenModel() at the right time —
// so auth:sanctum always validates against the correct isolated
// SQLite table.
//
// No changes to generated AuthControllers or route files needed.
// ============================================================

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Laravel\Sanctum\Sanctum;
use App\Arkzen\Readers\RegistryReader;
use Illuminate\Support\Facades\Log;

class ArkzenSanctumTokenResolver
{
    public function handle(Request $request, Closure $next): Response
    {
        // Only act on /api/{slug}/... routes
        // Pattern: /api/{tatemono-slug}/anything
        $path = $request->path(); // e.g. "api/mail-test/auth/me"

        if (!str_starts_with($path, 'api/')) {
            return $next($request);
        }

        // Extract the tatemono slug — second segment of the path
        $segments = explode('/', $path);
        // $segments[0] = 'api', $segments[1] = slug
        if (count($segments) < 2 || empty($segments[1])) {
            return $next($request);
        }

        $slug = $segments[1]; // e.g. "mail-test"

        // Convert slug → namespace (same logic as EventBuilder::toNamespace)
        // "mail-test" → "MailTest"
        $slugNs = str_replace(' ', '', ucwords(str_replace('-', ' ', $slug)));

        // Build the expected PersonalAccessToken class name
        $tokenClass = "App\\Models\\Arkzen\\{$slugNs}\\PersonalAccessToken";

        // Only swap the model if this tatemono's class actually exists.
        // This prevents misfires on non-tatemono /api/ routes.
        if (class_exists($tokenClass)) {
            Sanctum::usePersonalAccessTokenModel($tokenClass);

            Log::debug("[ArkzenSanctumTokenResolver] Set token model → {$tokenClass}");
        }

        return $next($request);
    }
}