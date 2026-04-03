<?php

// ============================================================
// ARKZEN ENGINE — REGISTRY READER
// Reads arkzen.json shared between frontend and backend
// ============================================================

namespace App\Arkzen\Readers;

use Illuminate\Support\Facades\File;

class RegistryReader
{
    // ─────────────────────────────────────────────
    // PATH
    // arkzen.json lives at project root
    // same file frontend watcher writes to
    // ─────────────────────────────────────────────

    private static function registryPath(): string
    {
        return base_path('arkzen.json');
    }

    // ─────────────────────────────────────────────
    // READ
    // ─────────────────────────────────────────────

    public static function read(): array
    {
        $path = self::registryPath();

        if (!File::exists($path)) {
            return [
                'engine'  => '1.0.0',
                'project' => basename(base_path()),
                'modules' => [],
            ];
        }

        $raw = File::get($path);
        return json_decode($raw, true) ?? [];
    }

    // ─────────────────────────────────────────────
    // WRITE
    // ─────────────────────────────────────────────

    public static function write(array $registry): void
    {
        File::put(
            self::registryPath(),
            json_encode($registry, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );
    }

    // ─────────────────────────────────────────────
    // UPDATE MODULE STATUS
    // ─────────────────────────────────────────────

    public static function updateModuleStatus(string $name, string $status): void
    {
        $registry = self::read();

        foreach ($registry['modules'] as &$module) {
            if ($module['name'] === $name) {
                $module['status']      = $status;
                $module['lastUpdated'] = now()->toISOString();
                break;
            }
        }

        self::write($registry);
    }

    // ─────────────────────────────────────────────
    // GET ACTIVE MODULES
    // ─────────────────────────────────────────────

    public static function getActiveModules(): array
    {
        $registry = self::read();
        return array_filter(
            $registry['modules'] ?? [],
            fn($m) => $m['status'] === 'active'
        );
    }

    // ─────────────────────────────────────────────
    // IS REGISTERED
    // ─────────────────────────────────────────────

    public static function isRegistered(string $name): bool
    {
        $registry = self::read();
        $names = array_column($registry['modules'] ?? [], 'name');
        return in_array($name, $names);
    }
}
