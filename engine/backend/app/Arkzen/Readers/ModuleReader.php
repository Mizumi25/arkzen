<?php

// ============================================================
// ARKZEN ENGINE — MODULE READER v5.1
// FIX: Reserved prefix + reserved model guard added to validate().
//
// Problem: If a tatemono declares @arkzen:api with prefix /api/auth
//   or model User, the engine would generate a second AuthController
//   that conflicts with the permanent ArkzenAuthController built by
//   AuthBuilder during setup. Routes would collide and login/register
//   would silently break.
//
// Fix: validate() now rejects:
//   1. Any api block whose prefix starts with /api/auth
//   2. Any api block whose model is "User" (reserved by the engine)
//   3. Any database block whose table is "users" (managed by Laravel)
//
// The correct pattern when auth: true is declared in @arkzen:meta is
// to simply use useAuthStore() on the frontend — the engine already
// provides /api/auth/login, /api/auth/register, /api/auth/logout,
// /api/auth/me via ArkzenAuthController. No Tatemono api block needed.
// ============================================================

namespace App\Arkzen\Readers;

class ModuleReader
{
    // ─────────────────────────────────────────────
    // RESERVED — engine-managed, never overridable by a tatemono
    // ─────────────────────────────────────────────

    private static array $reservedPrefixes = [
        '/api/auth',
    ];

    private static array $reservedModels = [
        'User',
    ];

    private static array $reservedTables = [
        'users',
    ];

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
                    if (empty($db['table'])) {
                        $errors[] = "databases[{$i}]: table is required";
                    }
                    if (empty($db['columns'])) {
                        $errors[] = "databases[{$i}]: columns is required";
                    }

                    // FIX: block reserved tables
                    if (!empty($db['table']) && in_array($db['table'], self::$reservedTables, true)) {
                        $errors[] = "databases[{$i}]: table \"{$db['table']}\" is reserved by the engine. "
                            . "The users table is managed by Laravel — do not redeclare it in a tatemono.";
                    }
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

                    // FIX: block reserved model names
                    if (!empty($api['model']) && in_array($api['model'], self::$reservedModels, true)) {
                        $errors[] = "apis[{$i}]: model \"{$api['model']}\" is reserved by the engine. "
                            . "Auth is handled automatically — use useAuthStore() on the frontend instead.";
                    }

                    // FIX: block reserved route prefixes
                    if (!empty($api['prefix'])) {
                        foreach (self::$reservedPrefixes as $reserved) {
                            if (str_starts_with($api['prefix'], $reserved)) {
                                $errors[] = "apis[{$i}]: prefix \"{$api['prefix']}\" is reserved by the engine. "
                                    . "The /api/auth/* routes are provided by ArkzenAuthController. "
                                    . "Do not redeclare them in a tatemono — use useAuthStore() on the frontend.";
                            }
                        }
                    }
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
    // Returns normalized module with databases[] and apis[]
    // Each database entry is a self-contained table definition.
    // Each api entry is a self-contained resource group.
    // ─────────────────────────────────────────────

    public static function parse(array $payload): array
    {
        $databases = [];
        $apis      = [];

        // ── Parse all database blocks ─────────────
        foreach (($payload['databases'] ?? []) as $db) {
            $table = $db['table'] ?? null;
            if (!$table || $table === '_none') continue;

            // Skip reserved tables silently after validation passed
            if (in_array($table, self::$reservedTables, true)) continue;

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

            // Skip reserved models silently after validation passed
            if (in_array($model, self::$reservedModels, true)) continue;

            $apis[] = [
                'model'      => $model,
                'controller' => $api['controller'],
                'prefix'     => $api['prefix'],
                'middleware' => $api['middleware'] ?? [],
                'endpoints'  => $api['endpoints']  ?? [],
            ];
        }

        return [
            'name'      => $payload['name'],
            'version'   => $payload['version'] ?? '1.0.0',
            'databases' => $databases,
            'apis'      => $apis,
        ];
    }

    // ─────────────────────────────────────────────
    // HELPER — find a database entry by table name
    // Used by ControllerBuilder to link model → table
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
        // Derive expected table name from model name
        // e.g. Product → products, OrderItem → order_items
        $snake = strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $modelName));
        $table = $snake . 's'; // simple pluralization

        foreach ($module['databases'] as $db) {
            if ($db['table'] === $table) return $db;
            // Also try exact match (e.g. model Inventory → table inventories)
            if (strtolower($modelName) === rtrim($db['table'], 's')) return $db;
        }

        // Fallback: return first database if only one exists
        if (count($module['databases']) === 1) {
            return $module['databases'][0];
        }

        return null;
    }
}