<?php

// ============================================================
// ARKZEN ENGINE — ENGINE MIDDLEWARE
// Protects internal engine routes from external access
// Only the frontend bridge can call these routes
// ============================================================

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ArkzenEngineMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $secret         = $request->header('X-Arkzen-Secret');
        $expectedSecret = config('arkzen.engine_secret', env('ARKZEN_ENGINE_SECRET', 'arkzen-engine-secret'));

        // Only allow from localhost in development
        $ip = $request->ip();
        $isLocal = in_array($ip, ['127.0.0.1', '::1', 'localhost']);

        if (!$isLocal || $secret !== $expectedSecret) {
            return response()->json([
                'error' => 'Unauthorized. Arkzen Engine routes are internal only.',
            ], 403);
        }

        return $next($request);
    }
}
