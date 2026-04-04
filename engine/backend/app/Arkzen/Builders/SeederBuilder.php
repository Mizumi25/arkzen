<?php

// ============================================================
// ARKZEN ENGINE — SEEDER BUILDER
// PATCHED v5.1: Tatemono-slug folder isolation + prefixed table + isolated DB
//   Before: database/seeders/arkzen/InventoryArkzenSeeder.php
//           DB::table('inventories')
//   After:  database/seeders/arkzen/inventory-management/InventoryArkzenSeeder.php
//           DB::connection('inventory_management')->table('inventory_management_inventories')
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Artisan;

class SeederBuilder
{
    public static function build(array $module): void
    {
        $db     = $module['database'];
        $seeder = $db['seeder'] ?? null;

        if (!$seeder) {
            Log::info("[Arkzen Seeder] No seeder declared. Skipping.");
            return;
        }

        $name       = $module['name'];                              // tatemono slug
        $tableName  = ModelBuilder::prefixedTable($name, $db['table']);
        $dbConn     = ModelBuilder::slugToConnection($name);
        $modelName  = $module['api']['model'];
        $seederName = "{$modelName}ArkzenSeeder";
        $seederDir  = database_path("seeders/arkzen/{$name}");
        $filePath   = "{$seederDir}/{$seederName}.php";

        File::ensureDirectoryExists($seederDir);

        $seedData = self::generateSeedData($seeder, $db['columns']);

        $content = "<?php

// ============================================================
// ARKZEN GENERATED SEEDER — {$seederName}
// Tatemono: {$name}  |  Connection: {$dbConn}
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// ============================================================

namespace Database\Seeders\Arkzen\\{$name};

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class {$seederName} extends Seeder
{
    public function run(): void
    {
        DB::connection('{$dbConn}')->table('{$tableName}')->truncate();

        DB::connection('{$dbConn}')->table('{$tableName}')->insert([
{$seedData}
        ]);
    }
}
";

        File::put($filePath, $content);
        Log::info("[Arkzen Seeder] ✓ Seeder created: {$name}/{$seederName}");

        self::runSeeder($seederName, $filePath, $name);
    }

    private static function generateSeedData(array $seeder, array $columns): string
    {
        $rows = [];
        $data = $seeder['data'] ?? [];

        foreach ($data as $row) {
            $fields = [];
            foreach ($row as $key => $value) {
                $formatted = is_string($value) ? "'{$value}'" : var_export($value, true);
                $fields[]  = "                '{$key}' => {$formatted}";
            }
            $fields[] = "                'created_at' => now()";
            $fields[] = "                'updated_at' => now()";
            $rows[]   = "            [\n" . implode(",\n", $fields) . "\n            ]";
        }

        return implode(",\n", $rows);
    }

    private static function runSeeder(string $seederName, string $filePath, string $name): void
    {
        Log::info("[Arkzen Seeder] Running seeder: {$name}/{$seederName}");

        // Load file into PHP runtime before Artisan can see the class
        require_once $filePath;

        Artisan::call('db:seed', [
            '--class' => "Database\\Seeders\\Arkzen\\{$name}\\{$seederName}",
            '--force' => true,
        ]);

        Log::info("[Arkzen Seeder] ✓ Seeder executed: {$name}/{$seederName}");
    }
}