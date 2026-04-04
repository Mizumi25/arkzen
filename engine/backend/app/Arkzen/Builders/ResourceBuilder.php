<?php

// ============================================================
// ARKZEN ENGINE — RESOURCE BUILDER
// PATCHED v5.1: Tatemono-slug folder isolation
//   Before: Http/Resources/Arkzen/InventoryResource.php
//   After:  Http/Resources/Arkzen/inventory-management/InventoryResource.php
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class ResourceBuilder
{
    public static function build(array $module): void
    {
        $api  = $module['api'];
        $db   = $module['database'];
        $name = $module['name'];                                    // tatemono slug

        if (empty($api['resource'])) return;

        $modelName    = $api['model'];
        $resourceName = "{$modelName}Resource";
        $filePath     = app_path("Http/Resources/Arkzen/{$name}/{$resourceName}.php");

        File::ensureDirectoryExists(app_path("Http/Resources/Arkzen/{$name}"));

        $fields = self::generateFields($db['columns'] ?? []);

        $content = "<?php

// ============================================================
// ARKZEN GENERATED RESOURCE — {$resourceName}
// Tatemono: {$name}
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// ============================================================

namespace App\Http\Resources\Arkzen\\{$name};

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
        Log::info("[Arkzen Resource] ✓ Resource created: {$name}/{$resourceName}");
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
