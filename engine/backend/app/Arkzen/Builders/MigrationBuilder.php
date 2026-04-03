<?php

// ============================================================
// ARKZEN ENGINE — MIGRATION BUILDER
// Generates Laravel migration files from tatemono
// database section, then runs them automatically
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;

class MigrationBuilder
{
    // ─────────────────────────────────────────────
    // COLUMN TYPE MAP
    // ─────────────────────────────────────────────

    private static array $typeMap = [
        'integer'    => 'integer',
        'bigInteger' => 'bigInteger',
        'string'     => 'string',
        'text'       => 'text',
        'longText'   => 'longText',
        'decimal'    => 'decimal',
        'float'      => 'float',
        'boolean'    => 'boolean',
        'date'       => 'date',
        'datetime'   => 'dateTime',
        'timestamp'  => 'timestamp',
        'json'       => 'json',
        'uuid'       => 'uuid',
    ];

    // ─────────────────────────────────────────────
    // BUILD
    // ─────────────────────────────────────────────

    public static function build(array $module): void
    {
        $db        = $module['database'];
        $tableName = $db['table'];
        $timestamp = date('Y_m_d_His');

        // If table already exists in DB, check for new columns only
        if (Schema::hasTable($tableName)) {
            self::buildUpdateMigration($module);
            return;
        }

        // Table doesn't exist — create fresh migration
        $className = self::toClassName($tableName);
        $fileName  = "{$timestamp}_create_{$tableName}_table.php";
        $filePath  = database_path("migrations/arkzen/{$fileName}");

        File::ensureDirectoryExists(database_path('migrations/arkzen'));

        $content = self::generateCreateMigration($className, $db);
        File::put($filePath, $content);
        Log::info("[Arkzen Migration] ✓ Migration created: {$fileName}");

        self::runMigration($filePath);
    }

    // ─────────────────────────────────────────────
    // GENERATE CREATE MIGRATION
    // ─────────────────────────────────────────────

    private static function generateCreateMigration(string $className, array $db): string
    {
        $tableName   = $db['table'];
        $columns     = self::generateColumns($db['columns']);
        $indexes     = self::generateIndexes($db['indexes'] ?? []);
        $timestamps  = $db['timestamps']  ? "\n            \$table->timestamps();"  : '';
        $softDeletes = $db['softDeletes'] ? "\n            \$table->softDeletes();" : '';

        return "<?php

// ============================================================
// ARKZEN GENERATED MIGRATION — {$tableName}
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// ============================================================

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('{$tableName}', function (Blueprint \$table) {
{$columns}{$indexes}{$timestamps}{$softDeletes}
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('{$tableName}');
    }
};
";
    }

    // ─────────────────────────────────────────────
    // GENERATE COLUMNS
    // ─────────────────────────────────────────────

    private static function generateColumns(array $columns): string
    {
        $lines = [];

        foreach ($columns as $name => $config) {
            $line = self::generateColumn($name, $config);
            if ($line) {
                $lines[] = "            {$line}";
            }
        }

        return implode("\n", $lines);
    }

    private static function generateColumn(string $name, array $config): string
    {
        $type   = $config['type'] ?? 'string';
        $method = self::$typeMap[$type] ?? 'string';

        if (!empty($config['primary']) && !empty($config['autoIncrement'])) {
            return "\$table->id();";
        }

        if ($type === 'uuid' && !empty($config['primary'])) {
            return "\$table->uuid('{$name}')->primary();";
        }

        if (!empty($config['foreign'])) {
            [$refTable, $refColumn] = explode('.', $config['foreign']);
            $onDelete = $config['onDelete'] ?? 'cascade';
            $nullable = !empty($config['nullable']) ? '->nullable()' : '';
            return "\$table->foreignId('{$name}'){$nullable}->constrained('{$refTable}')->onDelete('{$onDelete}');";
        }

        $call = "\$table->{$method}('{$name}'";

        if ($method === 'string' && !empty($config['length'])) {
            $call .= ", {$config['length']}";
        }

        if ($method === 'decimal') {
            $precision = $config['precision'] ?? 8;
            $scale     = $config['scale'] ?? 2;
            $call      = "\$table->decimal('{$name}', {$precision}, {$scale}";
        }

        $call .= ')';

        if (!empty($config['nullable']))   $call .= '->nullable()';
        if (!empty($config['unique']))     $call .= '->unique()';
        if (isset($config['default'])) {
            $default = is_string($config['default'])
                ? "'{$config['default']}'"
                : var_export($config['default'], true);
            $call .= "->default({$default})";
        }
        if (!empty($config['unsigned']))   $call .= '->unsigned()';

        return "{$call};";
    }

    // ─────────────────────────────────────────────
    // GENERATE INDEXES
    // ─────────────────────────────────────────────

    private static function generateIndexes(array $indexes): string
    {
        if (empty($indexes)) return '';

        $lines = ["\n"];

        foreach ($indexes as $index) {
            $cols    = "['" . implode("', '", $index['columns']) . "']";
            $method  = !empty($index['unique']) ? 'unique' : 'index';
            $lines[] = "            \$table->{$method}({$cols});";
        }

        return implode("\n", $lines);
    }

    // ─────────────────────────────────────────────
    // UPDATE MIGRATION
    // Only runs when tatemono has NEW columns not yet in DB
    // ─────────────────────────────────────────────

    private static function buildUpdateMigration(array $module): void
    {
        $db        = $module['database'];
        $tableName = $db['table'];

        // Find columns that don't exist in the table yet
        $newColumns = [];
        foreach ($db['columns'] as $name => $config) {
            // Skip primary key — always exists
            if (!empty($config['primary'])) continue;
            if (!Schema::hasColumn($tableName, $name)) {
                $newColumns[$name] = $config;
            }
        }

        // Nothing new — skip entirely, no migration needed
        if (empty($newColumns)) {
            Log::info("[Arkzen Migration] Table '{$tableName}' is up to date. No migration needed.");
            return;
        }

        $timestamp = date('Y_m_d_His');
        $fileName  = "{$timestamp}_update_{$tableName}_table.php";
        $filePath  = database_path("migrations/arkzen/{$fileName}");

        File::ensureDirectoryExists(database_path('migrations/arkzen'));

        $columns = self::generateColumns($newColumns);

        $content = "<?php

// ============================================================
// ARKZEN GENERATED UPDATE MIGRATION — {$tableName}
// Generated: " . now()->toISOString() . "
// ============================================================

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('{$tableName}', function (Blueprint \$table) {
{$columns}
        });
    }

    public function down(): void
    {
        // Reverse if needed
    }
};
";

        File::put($filePath, $content);
        Log::info("[Arkzen Migration] ✓ Update migration created: {$fileName}");

        self::runMigration($filePath);
    }

    // ─────────────────────────────────────────────
    // RUN MIGRATION
    // ─────────────────────────────────────────────

    private static function runMigration(string $filePath): void
    {
        Log::info("[Arkzen Migration] Running migration...");

        Artisan::call('migrate', [
            '--path'  => str_replace(base_path() . '/', '', $filePath),
            '--force' => true,
        ]);

        Log::info("[Arkzen Migration] ✓ Migration executed successfully");
    }

    // ─────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────

    private static function toClassName(string $tableName): string
    {
        return str_replace('_', '', ucwords($tableName, '_'));
    }
}