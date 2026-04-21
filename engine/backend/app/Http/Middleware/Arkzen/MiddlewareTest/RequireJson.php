<?php

// ============================================================
// ARKZEN GENERATED MIDDLEWARE — RequireJson [MiddlewareTest]
// Scoped to this tatemono.
// Body injected from @arkzen:middleware:requireJson DSL block.
// ============================================================

namespace App\Http\Middleware\Arkzen\MiddlewareTest;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireJson
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->isJson()) {
            return response()->json([
                'message' => 'Content-Type: application/json is required for this endpoint.',
                'hint'    => 'Set the Content-Type header to application/json',
            ], 415);
        }
        return $next($request);
    }
}