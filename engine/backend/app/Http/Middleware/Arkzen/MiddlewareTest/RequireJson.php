<?php

// ============================================================
// ARKZEN GENERATED MIDDLEWARE — RequireJson [MiddlewareTest]
// Scoped to this tatemono.
// No body provided in DSL — fill in handle() logic below.
// To inject: add @arkzen:middleware:requireJson ... :end block to your tatemono.
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