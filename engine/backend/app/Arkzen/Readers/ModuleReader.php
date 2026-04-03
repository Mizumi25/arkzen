<?php

// ============================================================
// ARKZEN ENGINE — MODULE READER v4.0
// Key change: reads databases[] and apis[] arrays.
// validate() and parse() both handle arrays now.
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
        // But if databases is present it must be a non-empty array of valid table definitions
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