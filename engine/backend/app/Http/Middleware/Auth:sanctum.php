<?php

// ============================================================
// ARKZEN GENERATED MIDDLEWARE STUB — Auth:sanctum
// This was declared in a tatemono but is not a built-in.
// Fill in your logic below.
// ============================================================

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class Auth:sanctum
{
    public function handle(Request $request, Closure $next): Response
    {
        // TODO: implement auth:sanctum middleware logic
        return $next($request);
    }
}