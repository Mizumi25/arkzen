<?php

// ============================================================
// ARKZEN ENGINE — RESOURCE BUILDER v5.3 (FIXED)
// FIXED: Physical folder now uses namespace-safe name (no hyphens)
//   inventory-management → InventoryManagement (both namespace AND folder)
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class ResourceBuilder
{
    public static function build(array $module): void
    {
        $api    = $module['api'];
        $db     = $module['database'];
        $name   = $module['name'];                                  // tatemono slug e.g. inventory-management
        $slugNs = EventBuilder::toNamespace($name);                // e.g. InventoryManagement

        if (empty($api['resource'])) return;

        $modelName    = $api['model'];
        $resourceName = "{$modelName}Resource";
        
        // FIXED: Use $slugNs for directory and file path
        $filePath     = app_path("Http/Resources/Arkzen/{$slugNs}/{$resourceName}.php");

        File::ensureDirectoryExists(app_path("Http/Resources/Arkzen/{$slugNs}"));

        $fields = self::generateFields($db['columns'] ?? []);

        $content = "<?php

// ============================================================
// ARKZEN GENERATED RESOURCE — {$resourceName}
// Tatemono: {$name}
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// ============================================================

namespace App\Http\Resources\Arkzen\\{$slugNs};

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class {$resourceName} extends JsonResource
{
    public function toArray(Request \$request): array
    {
        return [
{$fields}
        ];
    }
}
";

        File::put($filePath, $content);
        Log::info("[Arkzen Resource] ✓ Resource created: {$slugNs}/{$resourceName}");
    }

    private static function generateFields(array $columns): string
    {
        $lines = ["            'id'         => \$this->id,"];

        foreach ($columns as $name => $config) {
            if ($name === 'id') continue;
            if (in_array($name, ['created_at', 'updated_at', 'deleted_at'])) continue;
            $lines[] = "            '{$name}' => \$this->{$name},";
        }

        $lines[] = "            'created_at' => \$this->created_at?->toISOString(),";
        $lines[] = "            'updated_at' => \$this->updated_at?->toISOString(),";

        return implode("\n", $lines);
    }
}