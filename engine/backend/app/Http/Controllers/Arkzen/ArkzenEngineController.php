<?php

// ============================================================
// ARKZEN ENGINE — ENGINE CONTROLLER v5.4
// v5.4: Added Phase 4.5 — CustomRouteBuilder for @arkzen:routes.
//       Fixed $isStatic check to include customRoutes so tatemonos
//       with only @arkzen:routes blocks are not treated as static.
//       Added `use` statement for CustomRouteBuilder.
//
// FIXED v5.3 (kept): Three module key mismatches:
//     $module['realtime']  → $module['realtimes']  (Phase 9)
//     $module['mail']      → $module['mails']       (Phase 11b)
//     $module['console']   → $module['consoles']    (Phase 12)
//   Also fixed $isStatic check for events/jobs/mail/console-only tatemonos.
// ============================================================

namespace App\Http\Controllers\Arkzen;

use Illuminate\Routing\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\File;
use App\Arkzen\Readers\ModuleReader;
use App\Arkzen\Builders\AuthBuilder;
use App\Arkzen\Builders\MigrationBuilder;
use App\Arkzen\Builders\ModelBuilder;
use App\Arkzen\Builders\ControllerBuilder;
use App\Arkzen\Builders\CustomRouteBuilder;   // ← v5.4
use App\Arkzen\Builders\RouteRegistrar;
use App\Arkzen\Builders\SeederBuilder;
use App\Arkzen\Builders\MiddlewareBuilder;
use App\Arkzen\Builders\ResourceBuilder;
use App\Arkzen\Builders\RequestBuilder;
use App\Arkzen\Builders\PolicyBuilder;
use App\Arkzen\Builders\FactoryBuilder;
use App\Arkzen\Builders\EventBuilder;
use App\Arkzen\Builders\ListenerBuilder;
use App\Arkzen\Builders\BroadcastBuilder;
use App\Arkzen\Builders\ChannelBuilder;
use App\Arkzen\Builders\JobBuilder;
use App\Arkzen\Builders\NotificationBuilder;
use App\Arkzen\Builders\MailBuilder;
use App\Arkzen\Builders\ConsoleBuilder;

class ArkzenEngineController extends Controller
{
    public function health(): JsonResponse
    {
        return response()->json([
            'status'  => 'ok',
            'engine'  => 'Arkzen Backend Engine',
            'version' => '5.4.0',
        ]);
    }

    // ─────────────────────────────────────────────
    // BUILD
    // ─────────────────────────────────────────────

    public function build(Request $request): JsonResponse
    {
        $payload = $request->all();
        $steps   = [];
        $errors  = [];
        $name    = $payload['name'] ?? 'unknown';

        Log::info("[Arkzen] ═══ Building: {$name} ═══");

        $validation = ModuleReader::validate($payload);
        if (!$validation['valid']) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors'  => $validation['errors'],
                'steps'   => [],
            ], 422);
        }

        $module       = ModuleReader::parse($payload);
        $databases    = $module['databases'];
        $apis         = $module['apis'];
        $customRoutes = $module['customRoutes'];  // ← v5.4
        $hasAuth      = $module['auth'];

        // FIXED v5.4: customRoutes added to $isStatic check.
        // A tatemono with only @arkzen:routes blocks is NOT static —
        // it needs a backend build to generate controllers and routes.
        $isStatic = empty($databases) && empty($apis) && empty($customRoutes) && !$hasAuth
            && empty($module['events'])        && empty($module['realtimes'])
            && empty($module['jobs'])          && empty($module['notifications'])
            && empty($module['mails'])         && empty($module['consoles']);

        if ($isStatic) {
            return response()->json([
                'success' => true,
                'message' => "Static tatemono: {$name}",
                'steps'   => ['Static tatemono — no backend build needed'],
                'errors'  => [],
            ]);
        }

        // ── PHASE 0: Register isolated DB connections ──
        // Must happen before ANY migration or model usage.
        // Safe to run even when databases is empty — ensureDatabase
        // is a no-op if no tables are declared.
        Log::info("[Arkzen] Phase 0: Register isolated DB connections");
        $dbConn = ModelBuilder::slugToConnection($name);
        MigrationBuilder::ensureDatabase($name, $dbConn);

        // ── PHASE 1: Migrations ───────────────────
        Log::info("[Arkzen] Phase 1: Migrations");
        foreach ($databases as $db) {
            $this->run("Migration: {$db['table']}", $steps, $errors, function() use ($module, $db) {
                MigrationBuilder::build(array_merge($module, ['database' => $db]));
            });
        }

        // ── PHASE 2: Models + Factories ──────────
        Log::info("[Arkzen] Phase 2: Models + Factories");
        foreach ($apis as $api) {
            $db = ModuleReader::findDatabaseForModel($module, $api['model']);
            if (!$db) { $errors[] = "No database for model: {$api['model']}"; continue; }

            $apiModule = array_merge($module, ['database' => $db, 'api' => $api]);
            $this->run("Model: {$api['model']}",   $steps, $errors, fn() => ModelBuilder::build($apiModule));
            $this->run("Factory: {$api['model']}", $steps, $errors, fn() => FactoryBuilder::build($apiModule));
        }

        // ── PHASE 3: Requests + Policies ─────────
        Log::info("[Arkzen] Phase 3: Requests + Policies");
        foreach ($apis as $api) {
            $db        = ModuleReader::findDatabaseForModel($module, $api['model']);
            $apiModule = array_merge($module, ['database' => $db ?? [], 'api' => $api]);
            $this->run("Requests: {$api['model']}", $steps, $errors, fn() => RequestBuilder::build($apiModule));
            $this->run("Policy: {$api['model']}",   $steps, $errors, fn() => PolicyBuilder::build($apiModule));
        }

        // ── PHASE 4: Controllers ──────────────────
        Log::info("[Arkzen] Phase 4: Controllers");
        foreach ($apis as $api) {
            $db        = ModuleReader::findDatabaseForModel($module, $api['model']);
            $apiModule = array_merge($module, ['database' => $db ?? [], 'api' => $api]);
            $this->run("Controller: {$api['controller']}", $steps, $errors, fn() => ControllerBuilder::build($apiModule));
        }

        // ── PHASE 4.5: Custom Route Controllers ── v5.4
        // Generates lightweight controllers for @arkzen:routes blocks.
        // Runs after resource controllers (Phase 4) so the same slugNs
        // folder already exists for tatemonos that mix both types.
        if (!empty($customRoutes)) {
            Log::info("[Arkzen] Phase 4.5: Custom Route Controllers");
            $this->run("Custom Routes: {$name}", $steps, $errors, fn() => CustomRouteBuilder::build($module));
        }

        // ── PHASE 5: Resources ────────────────────
        Log::info("[Arkzen] Phase 5: Resources");
        foreach ($apis as $api) {
            $db        = ModuleReader::findDatabaseForModel($module, $api['model']);
            $apiModule = array_merge($module, ['database' => $db ?? [], 'api' => $api]);
            $this->run("Resource: {$api['model']}", $steps, $errors, fn() => ResourceBuilder::build($apiModule));
        }

        // ── PHASE 6: Routes ───────────────────────
        // RouteRegistrar v4.6 handles both resource routes and custom routes
        // in one pass — both are written to the same routes/modules/{name}.php file.
        Log::info("[Arkzen] Phase 6: Routes");
        $this->run("Routes: {$name}", $steps, $errors, fn() => RouteRegistrar::buildAll($module));

        // ── PHASE 6.5: Isolated Auth ──────────────
        if ($hasAuth) {
            Log::info("[Arkzen] Phase 6.5: Isolated auth for {$name}");
            $this->run("Auth: {$name}", $steps, $errors, fn() => AuthBuilder::buildForTatemono($module));
        }

        // ── PHASE 7: Seeders ──────────────────────
        Log::info("[Arkzen] Phase 7: Seeders");
        foreach ($databases as $db) {
            if (empty($db['seeder'])) continue;
            $matchingApi = $this->findApiForTable($apis, $db['table']);
            if (!$matchingApi) continue;
            $tableModule = array_merge($module, ['database' => $db, 'api' => $matchingApi]);
            $this->run("Seeder: {$db['table']}", $steps, $errors, fn() => SeederBuilder::build($tableModule));
        }

        // ── PHASE 8: Events + Listeners ───────────
        if (!empty($module['events'])) {
            Log::info("[Arkzen] Phase 8: Events + Listeners");
            $this->run("Events", $steps, $errors, fn() => EventBuilder::build($module));
        }

        // ── PHASE 9: Broadcast + Channels ─────────
        if (!empty($module['realtimes'])) {
            Log::info("[Arkzen] Phase 9: Broadcast + Channels");
            $this->run("Broadcast Events", $steps, $errors, fn() => BroadcastBuilder::build($module));
            $this->run("Channels",         $steps, $errors, fn() => ChannelBuilder::build($module));
        }

        // ── PHASE 10: Jobs ────────────────────────
        if (!empty($module['jobs'])) {
            Log::info("[Arkzen] Phase 10: Jobs");
            $this->run("Jobs", $steps, $errors, fn() => JobBuilder::build($module));
        }

        // ── PHASE 11: Notifications + Mail ────────
        if (!empty($module['notifications'])) {
            Log::info("[Arkzen] Phase 11: Notifications");
            $this->run("Notifications", $steps, $errors, fn() => NotificationBuilder::build($module));
        }
        if (!empty($module['mails'])) {
            Log::info("[Arkzen] Phase 11b: Mail");
            $this->run("Mail", $steps, $errors, fn() => MailBuilder::build($module));
        }

        // ── PHASE 12: Console Commands ────────────
        if (!empty($module['consoles'])) {
            Log::info("[Arkzen] Phase 12: Console");
            $this->run("Console Commands", $steps, $errors, fn() => ConsoleBuilder::build($module));
        }

        $success = empty($errors);
        $summary = count($databases) . ' table(s), ' . count($apis) . ' resource(s), ' . count($customRoutes) . ' custom route block(s)';
        Log::info("[Arkzen] ═══ " . ($success ? "✓ COMPLETE" : "✗ PARTIAL") . ": {$name} ═══");

        return response()->json([
            'success' => $success,
            'message' => $success ? "Built: {$name} ({$summary})" : "Partial build with errors",
            'steps'   => $steps,
            'errors'  => $errors,
        ], $success ? 200 : 207);
    }

    // ─────────────────────────────────────────────
    // REMOVE v5.2 — SLUG-NAMESPACE AWARE (FIXED)
    // Deletes entire tatemono camel-case folder from every
    // backend directory. Matches the fixed builders.
    // ─────────────────────────────────────────────

    public function remove(Request $request): JsonResponse
    {
        $name = $request->input('name');

        // FIXED: Convert to namespace-safe name for directories
        $slugNs = EventBuilder::toNamespace($name);

        Log::info("[Arkzen] Removing tatemono: {$name} (folders: {$slugNs})");

        // 1. Route file
        RouteRegistrar::remove($name);

        // Remove isolated auth artifacts (controller, User model, token model)
        AuthBuilder::removeForTatemono($name);

        // 2. Slug folders — using $slugNs (camel case) to match fixed builders
        $slugFolders = [
            app_path("Http/Controllers/Arkzen/{$slugNs}"),
            app_path("Models/Arkzen/{$slugNs}"),
            app_path("Http/Requests/Arkzen/{$slugNs}"),
            app_path("Policies/Arkzen/{$slugNs}"),
            app_path("Http/Resources/Arkzen/{$slugNs}"),
            database_path("factories/Arkzen/{$slugNs}"),
            database_path("seeders/arkzen/{$slugNs}"),
            database_path("migrations/arkzen/{$slugNs}"),
            app_path("Events/Arkzen/{$slugNs}"),
            app_path("Listeners/Arkzen/{$slugNs}"),
            app_path("Jobs/Arkzen/{$slugNs}"),
            app_path("Notifications/Arkzen/{$slugNs}"),
            app_path("Mail/Arkzen/{$slugNs}"),
            app_path("Console/Commands/Arkzen/{$slugNs}"),
        ];

        foreach ($slugFolders as $folder) {
            if (File::isDirectory($folder)) {
                File::deleteDirectory($folder);
                Log::info("[Arkzen] ✓ Deleted folder: " . basename(dirname($folder)) . "/{$slugNs}");
            }
        }

        // 3. Isolated SQLite DB file (uses hyphenated name for filename)
        $dbFile = database_path("arkzen/{$name}.sqlite");
        if (File::exists($dbFile)) {
            File::delete($dbFile);
            Log::info("[Arkzen] ✓ Deleted isolated DB: database/arkzen/{$name}.sqlite");
        }

        // 4. Channel authorizations (uses hyphenated name for module reference)
        $channelsPath = base_path('routes/channels.php');
        if (File::exists($channelsPath)) {
            $content    = File::get($channelsPath);
            $pattern    = '/\/\/ Module: ' . preg_quote($name, '/') . '\nBroadcast::channel\([^;]+\);?\n?\}/s';
            $newContent = preg_replace($pattern, '', $content);
            if ($newContent !== $content) {
                File::put($channelsPath, preg_replace('/\n{3,}/', "\n\n", $newContent));
                Log::info("[Arkzen] ✓ Removed channel authorizations for: {$name}");
            }
        }

        Log::info("[Arkzen] ✓ Full removal complete: {$name}");

        return response()->json(['success' => true, 'message' => "Removed: {$name}"]);
    }

    // ─────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────

    private function run(string $label, array &$steps, array &$errors, callable $fn): void
    {
        try {
            $fn();
            $steps[] = "✓ {$label}";
            Log::info("[Arkzen] ✓ {$label}");
        } catch (\Throwable $e) {
            $err = "✗ {$label}: " . $e->getMessage();
            $errors[] = $err;
            Log::error("[Arkzen] {$err}");
        }
    }

    private function findApiForTable(array $apis, string $tableName): ?array
    {
        $singular  = rtrim($tableName, 's');
        $modelName = str_replace('_', '', ucwords($singular, '_'));

        foreach ($apis as $api) {
            if (strtolower($api['model']) === strtolower($modelName)) return $api;
            $apiSnake = strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $api['model']));
            if ($apiSnake . 's' === $tableName || $apiSnake === $tableName) return $api;
        }
        return null;
    }
}