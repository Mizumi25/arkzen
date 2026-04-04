<?php

// ============================================================
// ARKZEN ENGINE — MODEL BUILDER
// PATCHED v5.1: Tatemono-slug folder isolation + table prefix + isolated DB
//   Before: Models/Arkzen/Inventory.php        table: inventories
//   After:  Models/Arkzen/inventory-management/Inventory.php
//           table: inventory_management_inventories
//           connection: inventory-management  (own SQLite)
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class ModelBuilder
{
    public static function build(array $module): void
    {
        $name      = $module['name'];                               // tatemono slug
        $modelName = $module['api']['model'];
        $tableName = self::prefixedTable($name, $module['database']['table']);
        $db        = $module['database'];
        $filePath  = app_path("Models/Arkzen/{$name}/{$modelName}.php");
        $dbConn    = self::slugToConnection($name);

        File::ensureDirectoryExists(app_path("Models/Arkzen/{$name}"));

        $fillable         = self::generateFillable($db['columns']);
        $casts            = self::generateCasts($db['columns']);
        $relations        = self::generateRelations($db['columns'], $module['databases'] ?? [], $module['database']['table'], $name);
        $softDeletes      = $db['softDeletes'] ? "use Illuminate\\Database\\Eloquent\\SoftDeletes;\n" : '';
        $softDeletesTrait = $db['softDeletes'] ? "\n    use SoftDeletes;" : '';

        $content = "<?php

// ============================================================
// ARKZEN GENERATED MODEL — {$modelName}
// Tatemono: {$name}
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// ============================================================

namespace App\Models\Arkzen\\{$name};

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
{$softDeletes}
class {$modelName} extends Model
{
    use HasFactory;{$softDeletesTrait}

    protected \$connection = '{$dbConn}';

    protected \$table = '{$tableName}';

    protected \$fillable = [
{$fillable}
    ];

    protected \$casts = [
{$casts}
    ];

{$relations}
}
";

        File::put($filePath, $content);
        Log::info("[Arkzen Model] ✓ Model created: {$name}/{$modelName}");
    }

    // ─────────────────────────────────────────────
    // TABLE PREFIX
    // inventory-management + inventories → inventory_management_inventories
    // ─────────────────────────────────────────────

    public static function prefixedTable(string $tatSlug, string $rawTable): string
    {
        $prefix = str_replace('-', '_', $tatSlug);
        // avoid double-prefix if already prefixed (rebuild scenario)
        if (str_starts_with($rawTable, $prefix . '_')) return $rawTable;
        return $prefix . '_' . $rawTable;
    }

    // ─────────────────────────────────────────────
    // CONNECTION NAME
    // inventory-management → inventory_management
    // ─────────────────────────────────────────────

    public static function slugToConnection(string $tatSlug): string
    {
        return str_replace('-', '_', $tatSlug);
    }

    // ─────────────────────────────────────────────
    // FILLABLE
    // ─────────────────────────────────────────────

    private static function generateFillable(array $columns): string
    {
        $fillable = [];
        foreach ($columns as $name => $config) {
            if (!empty($config['primary'])) continue;
            $fillable[] = "        '{$name}'";
        }
        return implode(",\n", $fillable);
    }

    // ─────────────────────────────────────────────
    // CASTS
    // ─────────────────────────────────────────────

    private static function generateCasts(array $columns): string
    {
        $castMap = [
            'boolean'    => 'boolean',
            'integer'    => 'integer',
            'bigInteger' => 'integer',
            'decimal'    => 'decimal:2',
            'float'      => 'float',
            'json'       => 'array',
            'date'       => 'date',
            'datetime'   => 'datetime',
            'timestamp'  => 'datetime',
        ];

        $casts = [];
        foreach ($columns as $name => $config) {
            $type = $config['type'] ?? 'string';
            if (isset($castMap[$type])) {
                $casts[] = "        '{$name}' => '{$castMap[$type]}'";
            }
        }
        return implode(",\n", $casts);
    }

    // ─────────────────────────────────────────────
    // RELATIONS
    // Uses prefixed table names + slug-namespaced model paths
    // ─────────────────────────────────────────────

    private static function generateRelations(array $columns, array $allDatabases, string $rawCurrentTable, string $tatSlug): string
    {
        $relations    = [];
        $currentTable = self::prefixedTable($tatSlug, $rawCurrentTable);

        // belongsTo — from foreign key columns on this model
        foreach ($columns as $name => $config) {
            if (empty($config['foreign'])) continue;

            [$refTable] = explode('.', $config['foreign']);
            $prefixedRef  = self::prefixedTable($tatSlug, $refTable);
            $relatedModel = self::tableToModel($refTable);
            $methodName   = str_replace('_id', '', $name);

            $relations[] = "    public function {$methodName}()
    {
        return \$this->belongsTo(\\App\\Models\\Arkzen\\{$tatSlug}\\{$relatedModel}::class, '{$name}');
    }";
        }

        // hasMany — detect other tables in same tatemono that foreign key into this one
        foreach ($allDatabases as $db) {
            if ($db['table'] === $rawCurrentTable) continue;

            foreach ($db['columns'] as $col => $cfg) {
                if (empty($cfg['foreign'])) continue;
                [$refTable] = explode('.', $cfg['foreign']);

                if ($refTable === $rawCurrentTable) {
                    $relatedModel = self::tableToModel($db['table']);
                    $methodName   = self::pluralize(str_replace('_id', '', $col));

                    $relations[] = "    public function {$methodName}()
    {
        return \$this->hasMany(\\App\\Models\\Arkzen\\{$tatSlug}\\{$relatedModel}::class, '{$col}');
    }";
                }
            }
        }

        return implode("\n\n", $relations);
    }

    private static function tableToModel(string $table): string
    {
        $singular = rtrim($table, 's');
        return str_replace('_', '', ucwords($singular, '_'));
    }

    private static function pluralize(string $word): string
    {
        if (str_ends_with($word, 'y')) return substr($word, 0, -1) . 'ies';
        if (str_ends_with($word, 's')) return $word . 'es';
        return $word . 's';
    }
}