<?php

// ============================================================
// ARKZEN ENGINE — SEEDER BUILDER v5.3 (FIXED)
// FIXED: Physical folder now uses namespace-safe name (no hyphens)
//   inventory-management → InventoryManagement (both namespace AND folder)
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

        $name       = $module['name'];                              // tatemono slug e.g. inventory-management
        $slugNs     = EventBuilder::toNamespace($name);            // e.g. InventoryManagement
        $tableName  = ModelBuilder::prefixedTable($name, $db['table']);
        $dbConn     = ModelBuilder::slugToConnection($name);
        $modelName  = $module['api']['model'];
        $seederName = "{$modelName}ArkzenSeeder";
        
        // FIXED: Use $slugNs for directory
        $seederDir  = database_path("seeders/arkzen/{$slugNs}");
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

namespace Database\Seeders\Arkzen\\{$slugNs};

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
        Log::info("[Arkzen Seeder] ✓ Seeder created: {$slugNs}/{$seederName}");

        self::runSeeder($seederName, $filePath, $name, $slugNs);
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

    private static function runSeeder(string $seederName, string $filePath, string $name, string $slugNs): void
    {
        Log::info("[Arkzen Seeder] Running seeder: {$name}/{$seederName}");

        require_once $filePath;

        Artisan::call('db:seed', [
            '--class' => "Database\\Seeders\\Arkzen\\{$slugNs}\\{$seederName}",
            '--force' => true,
        ]);

        Log::info("[Arkzen Seeder] ✓ Seeder executed: {$name}/{$seederName}");
    }
}