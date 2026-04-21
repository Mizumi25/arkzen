<?php

// ============================================================
// ARKZEN ENGINE — MODULE READER v8.1
// v8.1: Extract listenerBodies from events payload.
//       Each event's YAML carries listener_bodies (base64 JSON map)
//       injected by parser.ts parseAllEvents(). ModuleReader decodes
//       it here and merges all listener name→body maps so ListenerBuilder
//       can inject handle() bodies per listener name.
// v8.0: Pass customRoute handler bodies through normalization.
//       Pass middlewareSnippets from payload to module.
// v7.2 (kept): authSeed added to parse() return array.
// v7.1 (kept): customRoutes added.
// ============================================================

namespace App\Arkzen\Readers;

use Illuminate\Support\Facades\Log;
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
            $errors[] = 'name is required';
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

        // customRoutes validation
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
    // ─────────────────────────────────────────────

    public static function parse(array $payload): array
    {
        $databases = [];
        foreach (($payload['databases'] ?? []) as $db) {
            $databases[] = [
                'table'       => $db['table'],
                'timestamps'  => (bool) ($db['timestamps'] ?? true),
                'softDeletes' => (bool) ($db['softDeletes'] ?? false),
                'columns'     => $db['columns']  ?? [],
                'indexes'     => $db['indexes']  ?? [],
                'seeder'      => $db['seeder']   ?? null,
            ];
        }

        $apis = [];
        foreach (($payload['apis'] ?? []) as $api) {
            $apis[] = [
                'model'      => $api['model'],
                'controller' => $api['controller'],
                'prefix'     => $api['prefix'],
                'middleware' => $api['middleware'] ?? [],
                'endpoints'  => $api['endpoints']  ?? [],
                'resource'   => $api['resource']   ?? false,
                'policy'     => $api['policy']     ?? false,
                'factory'    => $api['factory']    ?? false,
            ];
        }

        // ── Custom routes — pass body through per route entry ──
        $customRoutes = [];
        foreach (($payload['customRoutes'] ?? []) as $cr) {
            $controller = $cr['controller'] ?? null;
            if (!$controller) continue;

            $routes = [];
            foreach (($cr['routes'] ?? []) as $r) {
                $method  = strtoupper($r['method']  ?? 'GET');
                $route   = $r['route']   ?? '/';
                $handler = $r['handler'] ?? 'handle';

                $routeEntry = [
                    'method'  => $method,
                    'route'   => $route,
                    'handler' => $handler,
                ];
                // v8.0: pass body through if present (set by parser.ts from @arkzen:handler blocks)
                if (!empty($r['body'])) {
                    $routeEntry['body'] = $r['body'];
                }
                $routes[] = $routeEntry;
            }

            if (empty($routes)) continue;

            $customRoutes[] = [
                'controller' => $controller,
                'middleware' => $cr['middleware'] ?? [],
                'routes'     => $routes,
            ];
        }

        // ── Framework sections (all normalised here) ──
        $events             = self::parseSections($payload['events']        ?? []);
        $realtimes          = self::parseRealtimeSections($payload['realtimes'] ?? []);
        $jobs               = self::parseSections($payload['jobs']          ?? []);
        $notifications      = self::parseSections($payload['notifications'] ?? []);
        $mails              = self::parseSections($payload['mails']         ?? []);
        $consoles           = self::parseSections($payload['consoles']      ?? []);

        // v8.0: middleware snippets — map of name → base64 PHP body
        $middlewareSnippets = $payload['middlewareSnippets'] ?? [];

        // v8.1: extract listenerBodies from events — each event config carries
        // a listener_bodies key (base64 JSON map of listenerName → base64 PHP).
        // Merge all events' maps into one flat map for ListenerBuilder.
        $listenerBodies = self::extractListenerBodies($events);

        return [
            'name'               => $payload['name'],
            'version'            => $payload['version'] ?? '1.0.0',
            'auth'               => (bool) ($payload['auth'] ?? false),
            'authSeed'           => $payload['authSeed'] ?? null,
            'databases'          => $databases,
            'apis'               => $apis,
            'customRoutes'       => $customRoutes,
            'events'             => $events,
            'realtimes'          => $realtimes,
            'jobs'               => $jobs,
            'notifications'      => $notifications,
            'mails'              => $mails,
            'consoles'           => $consoles,
            'middlewareSnippets' => $middlewareSnippets,
            'listenerBodies'     => $listenerBodies,   // ← v8.1
        ];
    }

    // ─────────────────────────────────────────────
    // extractListenerBodies — v8.1
    // Reads listener_bodies (base64 JSON) from each event config and
    // merges into a single flat map: listenerName → base64 PHP body.
    // ─────────────────────────────────────────────

    private static function extractListenerBodies(array $events): array
    {
        $merged = [];
        foreach ($events as $eventName => $config) {
            if (empty($config['listener_bodies'])) continue;
            try {
                $decoded = base64_decode($config['listener_bodies']);
                $map     = json_decode($decoded, true);
                if (is_array($map)) {
                    $merged = array_merge($merged, $map);
                }
            } catch (\Throwable $e) {
                Log::warning("[Arkzen ModuleReader] Could not decode listener_bodies for event: {$eventName}");
            }
        }
        return $merged;
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
    // ─────────────────────────────────────────────

    private static function parseSections(array $rawBlocks): array
    {
        $merged = [];

        foreach ($rawBlocks as $raw) {
            if (empty($raw) || !is_string($raw)) continue;

            try {
                $parsed = Yaml::parse($raw);
            } catch (\Throwable $e) {
                Log::warning(
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
    // parseRealtimeSections
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
                Log::warning(
                    '[Arkzen ModuleReader] Skipping malformed realtime YAML block: ' . $e->getMessage(),
                    ['raw' => substr($raw, 0, 200)]
                );
                continue;
            }
            if (!is_array($parsed)) continue;

            // Legacy grouped format
            if (array_key_exists('channels', $parsed) || array_key_exists('events', $parsed)) {
                if (!empty($parsed['channels']) && is_array($parsed['channels'])) {
                    $channels = array_merge($channels, $parsed['channels']);
                }
                if (!empty($parsed['events']) && is_array($parsed['events'])) {
                    $events = array_merge($events, $parsed['events']);
                }
                continue;
            }

            // Flat per-block format
            foreach ($parsed as $name => $config) {
                if (!is_array($config)) continue;
                unset($config['body']);

                if (isset($config['channel'])) {
                    $events[$name] = $config;
                } else {
                    $channels[$name] = $config;
                }
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

        foreach ($module['databases'] as $db) {
            if (strtolower($modelName) === rtrim($db['table'], 's')) return $db;
            if ($snake . 's' === $db['table'] || $snake === $db['table']) return $db;
        }

        if (!empty($module['databases'])) {
            return $module['databases'][0];
        }

        return null;
    }
}