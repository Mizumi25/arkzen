<?php

// ============================================================
// ARKZEN ENGINE — MODULE READER v6.1
// Key changes v6.1:
//   - parse() now includes events, realtimes, jobs,
//     notifications, mails, consoles from payload
//     so their builders are no longer dead code
// ============================================================

namespace App\Arkzen\Readers;

class ModuleReader
{

    // ─────────────────────────────────────────────
    // VALIDATE
    // ─────────────────────────────────────────────

    public static function validate(array $payload): array
    {
        $errors = [];

        // Name is always required
        if (empty($payload['name'])) {
            $errors[] = 'Missing required field: name';
        } elseif (!preg_match('/^[a-z][a-z0-9-]*$/', $payload['name'])) {
            $errors[] = 'name must be lowercase kebab-case (e.g. project-management)';
        }

        // databases and apis are now arrays — both optional (static tatemonos have neither)
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

        return [
            'valid'  => empty($errors),
            'errors' => $errors,
        ];
    }

    // ─────────────────────────────────────────────
    // PARSE
    // Returns normalized module with all sections
    // ─────────────────────────────────────────────

    public static function parse(array $payload): array
    {
        $databases = [];
        $apis      = [];

        // ── Parse all database blocks ─────────────
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

        // ── Parse all api blocks ──────────────────
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

        // ── Parse raw section blocks ──────────────
        // Each is an array of raw YAML strings sent from the frontend parser.
        // Builders receive them as-is and parse the YAML themselves.
        $events        = array_values(array_filter($payload['events']        ?? []));
        $realtimes     = array_values(array_filter($payload['realtimes']     ?? []));
        $jobs          = array_values(array_filter($payload['jobs']          ?? []));
        $notifications = array_values(array_filter($payload['notifications'] ?? []));
        $mails         = array_values(array_filter($payload['mails']         ?? []));
        $consoles      = array_values(array_filter($payload['consoles']      ?? []));

        return [
            'name'          => $payload['name'],
            'version'       => $payload['version']  ?? '1.0.0',
            'auth'          => (bool) ($payload['auth'] ?? false),
            'databases'     => $databases,
            'apis'          => $apis,
            'events'        => $events,
            'realtimes'     => $realtimes,
            'jobs'          => $jobs,
            'notifications' => $notifications,
            'mails'         => $mails,
            'consoles'      => $consoles,
        ];
    }

    // ─────────────────────────────────────────────
    // HELPER — find a database entry by table name
    // ─────────────────────────────────────────────

    public static function findDatabase(array $module, string $tableName): ?array
    {
        foreach ($module['databases'] as $db) {
            if ($db['table'] === $tableName) return $db;
        }
        return null;
    }

    // ─────────────────────────────────────────────
    // HELPER — find a database entry by model name
    // Convention: model Product → table products
    // ─────────────────────────────────────────────

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