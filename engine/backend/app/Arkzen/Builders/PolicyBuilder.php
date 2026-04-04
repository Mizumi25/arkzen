<?php

// ============================================================
// ARKZEN ENGINE — POLICY BUILDER
// Generates Laravel Policy classes for model authorization.
// Declared in @arkzen:api via: policy: true
//
// Generated policy covers:
//   viewAny  → index (list all)
//   view     → show (view one)
//   create   → store
//   update   → update (owns record OR is admin)
//   delete   → destroy (owns record OR is admin)
//
// FIX v5.1: varName() is now static — was incorrectly called
//   as $this->varName() inside a static method, causing
//   BadMethodCallException on every tatemono with policy: true.
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Artisan;

class PolicyBuilder
{
    public static function build(array $module): void
    {
        $api = $module['api'];
        $db  = $module['database'];

        if (empty($api['policy'])) return;

        $modelName  = $api['model'];
        $policyName = "{$modelName}Policy";
        $filePath   = app_path("Policies/Arkzen/{$policyName}.php");

        File::ensureDirectoryExists(app_path('Policies/Arkzen'));

        // Detect if model has an owner column (user_id, owner_id, created_by)
        $ownerColumn = self::detectOwnerColumn($db['columns'] ?? []);

        // FIX: was $this->varName() — $this does not exist in a static method
        $varName    = self::varName($modelName);
        $ownerCheck = $ownerColumn
            ? "\$user->id === \${$varName}->{$ownerColumn}"
            : 'false'; // no ownership concept — admin only

        $adminCheck = self::hasRoleColumn($db) ? "\$user->role === 'admin'" : 'false';

        $content = "<?php

// ============================================================
// ARKZEN GENERATED POLICY — {$policyName}
// Authorization rules for {$modelName} model.
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// ============================================================

namespace App\Policies\Arkzen;

use App\Models\User;
use App\Models\Arkzen\\{$modelName};
use Illuminate\Auth\Access\HandlesAuthorization;

class {$policyName}
{
    use HandlesAuthorization;

    // Anyone authenticated can list records
    public function viewAny(User \$user): bool
    {
        return true;
    }

    // Anyone authenticated can view a single record
    public function view(User \$user, {$modelName} \${$varName}): bool
    {
        return true;
    }

    // Anyone authenticated can create
    public function create(User \$user): bool
    {
        return true;
    }

    // Only owner or admin can update
    public function update(User \$user, {$modelName} \${$varName}): bool
    {
        return {$ownerCheck} || {$adminCheck};
    }

    // Only owner or admin can delete
    public function delete(User \$user, {$modelName} \${$varName}): bool
    {
        return {$ownerCheck} || {$adminCheck};
    }
}
";

        File::put($filePath, $content);
        Log::info("[Arkzen Policy] ✓ Policy created: {$policyName}");

        self::registerPolicy($modelName, $policyName);
    }

    // ─────────────────────────────────────────────
    // REGISTER POLICY in AuthServiceProvider
    // ─────────────────────────────────────────────

    private static function registerPolicy(string $modelName, string $policyName): void
    {
        $providerPath = app_path('Providers/AuthServiceProvider.php');

        if (!File::exists($providerPath)) {
            // Laravel 13 uses Gate facade directly
            Log::info("[Arkzen Policy] AuthServiceProvider not found — policy must be registered manually or via Gate::policy()");
            return;
        }

        $content = File::get($providerPath);
        $entry   = "\\App\\Models\\Arkzen\\{$modelName}::class => \\App\\Policies\\Arkzen\\{$policyName}::class,";

        if (str_contains($content, $entry)) {
            Log::info("[Arkzen Policy] Policy already registered: {$policyName}");
            return;
        }

        $content = str_replace(
            'protected $policies = [',
            "protected \$policies = [\n        {$entry}",
            $content
        );

        File::put($providerPath, $content);
        Log::info("[Arkzen Policy] ✓ Policy registered: {$policyName}");
    }

    // ─────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────

    private static function detectOwnerColumn(array $columns): ?string
    {
        $ownerCandidates = ['user_id', 'owner_id', 'created_by', 'author_id'];
        foreach ($ownerCandidates as $col) {
            if (isset($columns[$col])) return $col;
        }
        return null;
    }

    private static function hasRoleColumn(array $db): bool
    {
        // Check if users table likely has a role column (we assume it does if role middleware was used)
        return true;
    }

    // FIX: was `private function` (instance) — must be `private static function`
    private static function varName(string $modelName): string
    {
        return lcfirst($modelName);
    }
}