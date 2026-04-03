<?php

// ============================================================
// ARKZEN ENGINE — MODEL BUILDER
// Generates Laravel Eloquent model from tatemono data
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class ModelBuilder
{
    public static function build(array $module): void
    {
        $modelName = $module['api']['model'];
        $tableName = $module['database']['table'];
        $db        = $module['database'];
        $filePath  = app_path("Models/Arkzen/{$modelName}.php");

        File::ensureDirectoryExists(app_path('Models/Arkzen'));

        $fillable         = self::generateFillable($db['columns']);
        $casts            = self::generateCasts($db['columns']);
        $relations        = self::generateRelations($db['columns'], $module['databases'] ?? [], $tableName);
        $softDeletes      = $db['softDeletes'] ? "use Illuminate\\Database\\Eloquent\\SoftDeletes;\n" : '';
        $softDeletesTrait = $db['softDeletes'] ? "\n    use SoftDeletes;" : '';

        $content = "<?php

// ============================================================
// ARKZEN GENERATED MODEL — {$modelName}
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// ============================================================

namespace App\Models\Arkzen;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
{$softDeletes}
class {$modelName} extends Model
{
    use HasFactory;{$softDeletesTrait}

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
        Log::info("[Arkzen Model] ✓ Model created: {$modelName}");
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
    // Detects foreign keys and generates belongsTo.
    // Also generates hasMany for tables that reference this one.
    // ─────────────────────────────────────────────

    private static function generateRelations(array $columns, array $allDatabases, string $currentTable): string
    {
        $relations = [];

        // belongsTo — from foreign key columns on this model
        foreach ($columns as $name => $config) {
            if (empty($config['foreign'])) continue;

            [$refTable] = explode('.', $config['foreign']);

            $relatedModel = self::tableToModel($refTable);
            $methodName   = str_replace('_id', '', $name);

            $relations[] = "    public function {$methodName}()
    {
        return \$this->belongsTo(\\App\\Models\\Arkzen\\{$relatedModel}::class, '{$name}');
    }";
        }

        // hasMany — detect other tables that foreign key into this one
        foreach ($allDatabases as $db) {
            // Skip the current table itself
            if ($db['table'] === $currentTable) continue;
            
            foreach ($db['columns'] as $col => $cfg) {
                if (empty($cfg['foreign'])) continue;
                [$refTable] = explode('.', $cfg['foreign']);
                
                // If another table references our table, add hasMany
                if ($refTable === $currentTable) {
                    $relatedModel = self::tableToModel($db['table']);
                    // Convert column name to method name (e.g., project_id -> projects)
                    $methodName = str_replace('_id', '', $col);
                    // Pluralize for hasMany
                    $methodName = self::pluralize($methodName);
                    
                    $relations[] = "    public function {$methodName}()
    {
        return \$this->hasMany(\\App\\Models\\Arkzen\\{$relatedModel}::class, '{$col}');
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
        // Simple pluralization for common cases
        if (str_ends_with($word, 'y')) {
            return substr($word, 0, -1) . 'ies';
        }
        if (str_ends_with($word, 's')) {
            return $word . 'es';
        }
        return $word . 's';
    }
}