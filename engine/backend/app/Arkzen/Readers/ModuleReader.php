<?php

// ============================================================
// ARKZEN ENGINE — MODULE READER v7.1
// v7.1: customRoutes added to parse() and $isStatic check.
//       @arkzen:routes blocks are forwarded by the bridge as
//       a typed array of { controller, middleware, routes[] }.
//       ModuleReader normalises them into $module['customRoutes']
//       for CustomRouteBuilder and RouteRegistrar to consume.
//
// Key changes v7.0 (kept):
//   - ALL section types fully normalised here before any builder
//     receives the $module array. Builders are now yaml_parse-free.
//   - events, jobs, consoles, notifications, mails, realtimes
//     are parsed from raw YAML strings into typed PHP arrays,
//     exactly the same way databases and apis have always been.
//   - parseSections() is the single YAML-parsing entry point for
//     all framework sections — called once, in one place.
//   - Builders receive clean typed arrays and generate code
//     directly from them. No builder ever calls yaml_parse().
//
// DATA FLOW (all sections):
//   Tatemono DSL  →  TS parser  →  backend-bridge (.raw strings)
//   →  ModuleReader::parse()  →  typed PHP arrays
//   →  Builder::build($module)  →  generated PHP files
// ============================================================

namespace App\Arkzen\Readers;

use Symfony\Component\Yaml\Yaml;

class ModuleReader
{

    // ─────────────────────────────────────────────
    // VALIDATE
    // ─────────────────────────────────────────────

    public static function validate(array $payload): array
    {
        $errors = [];

        if (empty($payload['name'])) {
            $errors[] = 'Missing required field: name';
        } elseif (!preg_match('/^[a-z][a-z0-9-]*$/', $payload['name'])) {
            $errors[] = 'name must be lowercase kebab-case (e.g. project-management)';
        }

        if (!empty($payload['databases'])) {
            if (!is_array($payload['databases'])) {
                $errors[] = 'databases must be an array';
            } else {
                foreach ($payload['databases'] as $i => $db) {
                    if (empty($db['table']))   $errors[] = "databases[{$i}]: table is required";
                    if (empty($db['columns'])) $errors[] = "databases[{$i}]: columns is required";
                }
            }
        }

        if (!empty($payload['apis'])) {
            if (!is_array($payload['apis'])) {
                $errors[] = 'apis must be an array';
            } else {
                foreach ($payload['apis'] as $i => $api) {
                    if (empty($api['model']))      $errors[] = "apis[{$i}]: model is required";
                    if (empty($api['controller'])) $errors[] = "apis[{$i}]: controller is required";
                    if (empty($api['prefix']))     $errors[] = "apis[{$i}]: prefix is required";
                }
            }
        }

        // customRoutes validation — each block needs a controller and at least one route
        if (!empty($payload['customRoutes'])) {
            if (!is_array($payload['customRoutes'])) {
                $errors[] = 'customRoutes must be an array';
            } else {
                foreach ($payload['customRoutes'] as $i => $cr) {
                    if (empty($cr['controller'])) $errors[] = "customRoutes[{$i}]: controller is required";
                    if (empty($cr['routes']))     $errors[] = "customRoutes[{$i}]: routes array is required";
                }
            }
        }

        return [
            'valid'  => empty($errors),
            'errors' => $errors,
        ];
    }

    // ─────────────────────────────────────────────
    // PARSE
    // Returns a fully-normalised $module array.
    // Every key holds typed PHP data — no raw strings,
    // no deferred YAML parsing, no builder-side yaml_parse().
    // ─────────────────────────────────────────────

    public static function parse(array $payload): array
    {
        // ── databases ────────────────────────────
        $databases = [];
        foreach (($payload['databases'] ?? []) as $db) {
            $table = $db['table'] ?? null;
            if (!$table || $table === '_none') continue;

            $databases[] = [
                'table'       => $table,
                'timestamps'  => $db['timestamps']  ?? true,
                'softDeletes' => $db['softDeletes'] ?? false,
                'columns'     => $db['columns']     ?? [],
                'indexes'     => $db['indexes']     ?? [],
                'seeder'      => $db['seeder']      ?? null,
            ];
        }

        // ── apis ─────────────────────────────────
        $apis = [];
        foreach (($payload['apis'] ?? []) as $api) {
            $model = $api['model'] ?? null;
            if (!$model || $model === '_none') continue;

            $apis[] = [
                'model'      => $model,
                'controller' => $api['controller'],
                'prefix'     => $api['prefix'],
                'middleware' => $api['middleware'] ?? [],
                'endpoints'  => $api['endpoints']  ?? [],
                'resource'   => $api['resource']   ?? false,
                'policy'     => $api['policy']     ?? false,
                'factory'    => $api['factory']    ?? false,
            ];
        }

        // ── custom routes — v7.1 ─────────────────
        // Lightweight one-off endpoints with no model/database.
        // Each entry: { controller, middleware, routes: [{method, route, handler}] }
        $customRoutes = [];
        foreach (($payload['customRoutes'] ?? []) as $cr) {
            $controller = $cr['controller'] ?? null;
            if (!$controller) continue;

            $routes = [];
            foreach (($cr['routes'] ?? []) as $r) {
                $method  = strtoupper($r['method']  ?? 'GET');
                $route   = $r['route']   ?? '/';
                $handler = $r['handler'] ?? 'handle';

                $routes[] = [
                    'method'  => $method,
                    'route'   => $route,
                    'handler' => $handler,
                ];
            }

            if (empty($routes)) continue;

            $customRoutes[] = [
                'controller' => $controller,
                'middleware' => $cr['middleware'] ?? [],
                'routes'     => $routes,
            ];
        }

        // ── framework sections (all normalised here) ──
        // Each arrives as an array of raw YAML strings from the bridge.
        // parseSections() merges all blocks into one flat map and
        // returns a typed PHP array ready for the relevant builder.
        $events        = self::parseSections($payload['events']        ?? []);
        $realtimes     = self::parseRealtimeSections($payload['realtimes'] ?? []);
        $jobs          = self::parseSections($payload['jobs']          ?? []);
        $notifications = self::parseSections($payload['notifications'] ?? []);
        $mails         = self::parseSections($payload['mails']         ?? []);
        $consoles      = self::parseSections($payload['consoles']      ?? []);

        return [
            'name'          => $payload['name'],
            'version'       => $payload['version'] ?? '1.0.0',
            'auth'          => (bool) ($payload['auth'] ?? false),
            'databases'     => $databases,
            'apis'          => $apis,
            'customRoutes'  => $customRoutes,   // ← v7.1
            'events'        => $events,
            'realtimes'     => $realtimes,
            'jobs'          => $jobs,
            'notifications' => $notifications,
            'mails'         => $mails,
            'consoles'      => $consoles,
        ];
    }

    // ─────────────────────────────────────────────
    // parseSections — generic flat-map normaliser
    //
    // Accepts an array of raw YAML strings (one per tatemono block),
    // merges all parsed key→config maps into a single flat array.
    //
    // Input example (@arkzen:events):
    //   [ "order-placed:\n  listeners: [SendOrderConfirmation]\n..." ]
    //
    // Output (what every builder now receives):
    //   [ 'order-placed' => ['listeners' => ['SendOrderConfirmation']], ... ]
    //
    // This is the exact same contract that ModelBuilder / ControllerBuilder
    // have always had from the database/api normalisation above — now
    // applied uniformly to every section type.
    // ─────────────────────────────────────────────

    private static function parseSections(array $rawBlocks): array
    {
        $merged = [];

        foreach ($rawBlocks as $raw) {
            if (empty($raw) || !is_string($raw)) continue;

            try {
                $parsed = Yaml::parse($raw);
            } catch (\Throwable $e) {
                // Malformed YAML in one block must not crash the entire build.
                // Log it and skip — the builder will generate what it can.
                \Illuminate\Support\Facades\Log::warning(
                    '[Arkzen ModuleReader] Skipping malformed YAML block: ' . $e->getMessage(),
                    ['raw' => substr($raw, 0, 200)]
                );
                continue;
            }

            if (!is_array($parsed)) continue;

            $merged = array_merge($merged, $parsed);
        }

        return $merged;
    }

    // ─────────────────────────────────────────────
    // parseRealtimeSections — realtime has two sub-keys
    //
    // @arkzen:realtime blocks contain two distinct sub-maps:
    //   channels: { name → config }
    //   events:   { name → config }
    //
    // BroadcastBuilder reads $module['realtimes']['events']
    // ChannelBuilder reads  $module['realtimes']['channels']
    //
    // Returns: ['channels' => [...], 'events' => [...]]
    // ─────────────────────────────────────────────

    private static function parseRealtimeSections(array $rawBlocks): array
    {
        $channels = [];
        $events   = [];

        foreach ($rawBlocks as $raw) {
            if (empty($raw) || !is_string($raw)) continue;

            try {
                $parsed = Yaml::parse($raw);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning(
                    '[Arkzen ModuleReader] Skipping malformed realtime YAML block: ' . $e->getMessage(),
                    ['raw' => substr($raw, 0, 200)]
                );
                continue;
            }
            if (!is_array($parsed)) continue;

            if (!empty($parsed['channels']) && is_array($parsed['channels'])) {
                $channels = array_merge($channels, $parsed['channels']);
            }
            if (!empty($parsed['events']) && is_array($parsed['events'])) {
                $events = array_merge($events, $parsed['events']);
            }
        }

        return [
            'channels' => $channels,
            'events'   => $events,
        ];
    }

    // ─────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────

    public static function findDatabase(array $module, string $tableName): ?array
    {
        foreach ($module['databases'] as $db) {
            if ($db['table'] === $tableName) return $db;
        }
        return null;
    }

    public static function findDatabaseForModel(array $module, string $modelName): ?array
    {
        $snake = strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $modelName));
        $table = $snake . 's';

        foreach ($module['databases'] as $db) {
            if ($db['table'] === $table) return $db;
            if (strtolower($modelName) === rtrim($db['table'], 's')) return $db;
        }

        if (count($module['databases']) === 1) {
            return $module['databases'][0];
        }

        return null;
    }
}