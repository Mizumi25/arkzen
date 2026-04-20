<?php

// ============================================================
// ARKZEN GENERATED MIDDLEWARE — CheckRole [RolesTest]
// Scoped to this tatemono. Checks if the authenticated user
// has a required role.
// Usage in tatemono: middleware: [auth, role:admin]
// Requires: the tatemono's users table to have a `role` column.
// ============================================================

namespace App\Http\Middleware\Arkzen\RolesTest;

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