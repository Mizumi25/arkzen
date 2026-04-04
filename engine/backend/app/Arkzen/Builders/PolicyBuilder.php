<?php

// ============================================================
// ARKZEN ENGINE — POLICY BUILDER
// PATCHED v5.1: Tatemono-slug folder isolation
//   Before: Policies/Arkzen/InventoryPolicy.php
//   After:  Policies/Arkzen/inventory-management/InventoryPolicy.php
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class PolicyBuilder
{
    public static function build(array $module): void
    {
        $api  = $module['api'];
        $db   = $module['database'];
        $name = $module['name'];                                    // tatemono slug

        if (empty($api['policy'])) return;

        $modelName  = $api['model'];
        $policyName = "{$modelName}Policy";
        $filePath   = app_path("Policies/Arkzen/{$name}/{$policyName}.php");

        File::ensureDirectoryExists(app_path("Policies/Arkzen/{$name}"));

        $ownerColumn = self::detectOwnerColumn($db['columns'] ?? []);
        $varName     = self::varName($modelName);
        $ownerCheck  = $ownerColumn
            ? "\$user->id === \${$varName}->{$ownerColumn}"
            : 'false';
        $adminCheck  = self::hasRoleColumn($db) ? "\$user->role === 'admin'" : 'false';

        $content = "<?php

// ============================================================
// ARKZEN GENERATED POLICY — {$policyName}
// Tatemono: {$name}
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// ============================================================

namespace App\Policies\Arkzen\\{$name};

use App\Models\User;
use App\Models\Arkzen\\{$name}\\{$modelName};
use Illuminate\Auth\Access\HandlesAuthorization;

class {$policyName}
{
    use HandlesAuthorization;

    public function viewAny(User \$user): bool { return true; }

    public function view(User \$user, {$modelName} \${$varName}): bool { return true; }

    public function create(User \$user): bool { return true; }

    public function update(User \$user, {$modelName} \${$varName}): bool
    {
        return {$ownerCheck} || {$adminCheck};
    }

    public function delete(User \$user, {$modelName} \${$varName}): bool
    {
        return {$ownerCheck} || {$adminCheck};
    }
}
";

        File::put($filePath, $content);
        Log::info("[Arkzen Policy] ✓ Policy created: {$name}/{$policyName}");
    }

    private static function detectOwnerColumn(array $columns): ?string
    {
        foreach (['user_id', 'owner_id', 'created_by', 'author_id'] as $col) {
            if (isset($columns[$col])) return $col;
        }
        return null;
    }

    private static function hasRoleColumn(array $db): bool { return true; }

    private static function varName(string $modelName): string { return lcfirst($modelName); }
}