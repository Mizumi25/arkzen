<?php

// ============================================================
// ARKZEN ENGINE — SEEDER BUILDER
// Generates and runs seeders if tatemono declares seed data.
//
// FIX: require_once the seeder file before calling db:seed
// because composer dump-autoload never runs at runtime,
// so newly generated files aren't in the autoload classmap.
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

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

        $tableName  = $db['table'];
        $modelName  = $module['api']['model'];
        $seederName = "{$modelName}ArkzenSeeder";
        $seederDir  = database_path('seeders/arkzen');
        $filePath   = "{$seederDir}/{$seederName}.php";

        File::ensureDirectoryExists($seederDir);

        $seedData = self::generateSeedData($seeder, $db['columns']);

        $content = "<?php

// ============================================================
// ARKZEN GENERATED SEEDER — {$seederName}
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// ============================================================

namespace Database\Seeders\Arkzen;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class {$seederName} extends Seeder
{
    public function run(): void
    {
        DB::table('{$tableName}')->truncate();

        DB::table('{$tableName}')->insert([
{$seedData}
        ]);
    }
}
";

        File::put($filePath, $content);
        Log::info("[Arkzen Seeder] ✓ Seeder created: {$seederName}");

        self::runSeeder($seederName, $filePath);
    }

    // ─────────────────────────────────────────────
    // GENERATE SEED DATA
    // ─────────────────────────────────────────────

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

    // ─────────────────────────────────────────────
    // RUN SEEDER
    // FIXED: require_once the file directly so PHP knows
    // the class exists without needing composer dump-autoload
    // ─────────────────────────────────────────────

    private static function runSeeder(string $seederName, string $filePath): void
    {
        Log::info("[Arkzen Seeder] Running seeder: {$seederName}");

        // CRITICAL FIX — load the file into PHP's runtime class map
        // before calling Artisan. Without this, the class doesn't exist
        // because composer dump-autoload never ran after file creation.
        require_once $filePath;

        Artisan::call('db:seed', [
            '--class' => "Database\\Seeders\\Arkzen\\{$seederName}",
            '--force' => true,
        ]);

        Log::info("[Arkzen Seeder] ✓ Seeder executed successfully");
    }
}