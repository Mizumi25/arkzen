<?php

// ============================================================
// ARKZEN ENGINE — CUSTOM ROUTE BUILDER v1.1
// v1.1: Smart generation for simulation endpoints. If the route
//       contains a {code} parameter, auto-generate a handler that
//       returns that HTTP status code instead of a stub.
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

            preg_match_all('/\{([a-zA-Z0-9_]+)\}/', $route, $paramMatches);
            $paramNames = $paramMatches[1] ?? [];

            $paramExtractions = '';
            foreach ($paramNames as $i => $paramName) {
                $paramExtractions .= "\n        \${$paramName} = \$params[{$i}] ?? null;";
            }

            // SMART GENERATION: if the route has exactly one parameter named "code",
            // generate a simulation handler that returns that HTTP status code.
            if (count($paramNames) === 1 && $paramNames[0] === 'code') {
                $methods .= "
    /**
     * {$docRoute}
     * Auto-generated simulation handler — returns the HTTP status from the URL.
     */
    public function {$handler}(Request \$request, mixed ...\$params): JsonResponse
    {{$paramExtractions}

        \$code = isset(\$params[0]) ? (int)\$params[0] : 200;
        // Ensure the code is a valid HTTP status
        \$code = \$code >= 100 && \$code < 600 ? \$code : 400;

        return response()->json([
            'simulated' => true,
            'code'      => \$code,
        ], \$code);
    }
";
            } else {
                // Fallback stub for truly custom routes
                $methods .= "
    /**
     * {$docRoute}
     * Auto-generated stub — replace with your custom logic.
     * DO NOT EDIT DIRECTLY — edit the @arkzen:routes block in the tatemono.
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
}