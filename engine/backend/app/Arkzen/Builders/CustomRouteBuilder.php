<?php

// ============================================================
// ARKZEN ENGINE — CUSTOM ROUTE BUILDER v2.0
//
// v2.0: Body injection for handler methods.
//       Each route entry now carries an optional `body` key
//       (base64-encoded PHP set by parser.ts from @arkzen:handler:name blocks).
//       Handler methods inject the body instead of // TODO stub.
//       Falls back gracefully: if no body, emits the same stub as before.
//       The {code} simulation smart-path is preserved and takes priority
//       over body injection (simulation routes are generated, not injectable).
//
// v1.1 (kept): Smart generation for simulation endpoints. If the route
//       contains a {code} parameter, auto-generate a simulation handler.
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class CustomRouteBuilder
{
    public static function build(array $module): void
    {
        $customRoutes = $module['customRoutes'] ?? [];
        if (empty($customRoutes)) return;

        $slug   = $module['name'];
        $slugNs = EventBuilder::toNamespace($slug);

        File::ensureDirectoryExists(app_path("Http/Controllers/Arkzen/{$slugNs}"));

        $byController = [];
        foreach ($customRoutes as $cr) {
            $controllerName = $cr['controller'];
            if (!isset($byController[$controllerName])) {
                $byController[$controllerName] = [
                    'middleware' => $cr['middleware'],
                    'routes'     => [],
                ];
            }
            foreach ($cr['routes'] as $r) {
                $byController[$controllerName]['routes'][] = $r;
            }
        }

        foreach ($byController as $controllerName => $config) {
            self::buildController($slug, $slugNs, $controllerName, $config['routes']);
        }
    }

    private static function buildController(
        string $slug,
        string $slugNs,
        string $controllerName,
        array  $routes
    ): void {
        $handlers = [];
        foreach ($routes as $r) {
            $handler = $r['handler'];
            if (!isset($handlers[$handler])) {
                $handlers[$handler] = $r;
            }
        }

        $methods = '';
        foreach ($handlers as $handler => $r) {
            $route    = $r['route'];
            $method   = $r['method'];
            $docRoute = "{$method} {$route}";
            $body     = isset($r['body']) && $r['body'] ? base64_decode($r['body']) : null;

            preg_match_all('/\{([a-zA-Z0-9_]+)\}/', $route, $paramMatches);
            $paramNames = $paramMatches[1] ?? [];

            $paramExtractions = '';
            foreach ($paramNames as $i => $paramName) {
                $paramExtractions .= "\n        \${$paramName} = \$params[{$i}] ?? null;";
            }

            // SIMULATION SMART PATH: {code} route → auto-generate, ignore body injection
            if (count($paramNames) === 1 && $paramNames[0] === 'code') {
                $methods .= "
    /**
     * {$docRoute}
     * Auto-generated simulation handler — returns the HTTP status from the URL.
     */
    public function {$handler}(Request \$request, mixed ...\$params): JsonResponse
    {{$paramExtractions}

        \$code = isset(\$params[0]) ? (int)\$params[0] : 200;
        \$code = \$code >= 100 && \$code < 600 ? \$code : 400;

        return response()->json([
            'simulated' => true,
            'code'      => \$code,
        ], \$code);
    }
";
                continue;
            }

            // INJECTED BODY PATH: body from @arkzen:handler:name DSL block
            if ($body && trim($body) !== '') {
                $methodBody = self::indentBody(trim($body));
                $methods .= "
    /**
     * {$docRoute}
     */
    public function {$handler}(Request \$request, mixed ...\$params): JsonResponse
    {{$paramExtractions}

{$methodBody}
    }
";
                continue;
            }

            // FALLBACK STUB: no body provided
            $methods .= "
    /**
     * {$docRoute}
     * Add @arkzen:handler:{$handler} ... :end block to your tatemono to inject logic.
     */
    public function {$handler}(Request \$request, mixed ...\$params): JsonResponse
    {{$paramExtractions}

        // TODO: Replace with your custom logic
        return response()->json([
            'tatemono' => '{$slug}',
            'handler'  => '{$handler}',
            'params'   => \$params,
        ], 200);
    }
";
        }

        $filePath = app_path("Http/Controllers/Arkzen/{$slugNs}/{$controllerName}.php");

        $content = "<?php

// ============================================================
// ARKZEN GENERATED CONTROLLER — {$controllerName}
// Tatemono: {$slug}
// Type: Custom Route Controller (no model/resource)
// DO NOT EDIT DIRECTLY. Edit the @arkzen:routes block in the tatemono instead.
// Generated: " . now()->toISOString() . "
// ============================================================

namespace App\\Http\\Controllers\\Arkzen\\{$slugNs};

use Illuminate\\Http\\Request;
use Illuminate\\Http\\JsonResponse;
use App\\Http\\Controllers\\Controller;

class {$controllerName} extends Controller
{{$methods}
}
";

        File::put($filePath, $content);
        Log::info("[Arkzen CustomRouteBuilder] ✓ Controller created: {$slugNs}/{$controllerName}");
    }

    // ─────────────────────────────────────────────
    // INDENT BODY — re-indent injected PHP to 8 spaces (inside method)
    // ─────────────────────────────────────────────

    private static function indentBody(string $body): string
    {
        // Strip outer function signature if user wrote the full method
        if (preg_match('/public\s+function\s+\w+\s*\(.*\)\s*(?::\s*\w+\s*)?\{(.+)\}/s', $body, $matches)) {
            $inner = trim($matches[1]);
        } else {
            $inner = trim($body);
        }
        $lines = explode("\n", $inner);
        return implode("\n", array_map(fn($l) => '        ' . $l, $lines));
    }
}