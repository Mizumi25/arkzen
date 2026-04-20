<?php

// ============================================================
// ARKZEN GENERATED MIDDLEWARE STUB — RequireJson [MiddlewareTest]
// Scoped to this tatemono. Declared in the tatemono DSL but
// not a known built-in. Fill in your logic below.
// ============================================================

namespace App\Http\Middleware\Arkzen\MiddlewareTest;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireJson
{
    public function handle(Request $request, Closure $next): Response
    {
        // TODO: implement requireJson middleware logic
        return $next($request);
    }
}