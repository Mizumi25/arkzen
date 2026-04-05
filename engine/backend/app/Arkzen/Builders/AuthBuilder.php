<?php

// ============================================================
// ARKZEN ENGINE — AUTH BUILDER v2.1 (PER-TATEMONO)
// Auth is now fully isolated per tatemono.
//
// Each tatemono with auth:true gets:
//   - Its own users table  → database/arkzen/{slug}.sqlite
//   - Its own personal_access_tokens table → same SQLite
//   - Its own namespaced User + PersonalAccessToken models
//   - Its own namespaced AuthController
//   - Auth routes injected into routes/modules/{slug}.php
//
// Called by ArkzenEngineController::build() during Phase 0.5.
// setup.js no longer touches auth at all.
//
// v2.1 — Added `role` column to all auth users tables.
//   migrateAuthTables() now always includes `role varchar(20) default 'user'`
//   on CREATE, and adds it via ALTER if the table already exists (idempotent).
//   generateUserModel() adds 'role' to $fillable so update/promote/demote
//   calls go through without mass-assignment guards.
//   This aligns the engine with CheckRole middleware (MiddlewareBuilder) which
//   reads $request->user()->role — that field must exist for role:* middleware
//   to function on any auth:true tatemono.
// ============================================================
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;

class AuthBuilder
{
    // ─────────────────────────────────────────────
    // ENTRY POINT — called per tatemono during build
    // ─────────────────────────────────────────────

    public static function buildForTatemono(array $module): void
    {
        $name   = $module['name'];
        $dbConn = ModelBuilder::slugToConnection($name);
        $slugNs = EventBuilder::toNamespace($name);
        $prefix = str_replace('-', '_', $name);

        Log::info("[Arkzen Auth] Building isolated auth for: {$name}");

        // 1. Ensure tatemono DB exists (MigrationBuilder may have already done this)
        MigrationBuilder::ensureDatabase($name, $dbConn);

        // 2. Create users + personal_access_tokens directly on the tatemono connection
        self::migrateAuthTables($dbConn, $prefix);

        // 3. Generate tatemono-scoped User model
        self::generateUserModel($name, $slugNs, $dbConn, $prefix);

        // 4. Generate tatemono-scoped PersonalAccessToken model
        self::generateTokenModel($name, $slugNs, $dbConn, $prefix);

        // 5. Generate tatemono-scoped AuthController
        self::generateAuthController($name, $slugNs, $dbConn, $prefix);

        // 6. Inject auth routes into routes/modules/{name}.php
        self::injectAuthRoutes($name, $slugNs);

        Log::info("[Arkzen Auth] ✓ Isolated auth complete for: {$name}");
    }

    // ─────────────────────────────────────────────
    // MIGRATE — users + personal_access_tokens
    // Runs directly on the tatemono's own connection.
    // No artisan migrate — we control exactly which
    // SQLite file these tables land in.
    // ─────────────────────────────────────────────

    private static function migrateAuthTables(string $dbConn, string $prefix): void
    {
        $usersTable  = "{$prefix}_users";
        $tokensTable = "{$prefix}_personal_access_tokens";

        if (!Schema::connection($dbConn)->hasTable($usersTable)) {
            Schema::connection($dbConn)->create($usersTable, function ($table) {
                $table->id();
                $table->string('name');
                $table->string('email')->unique();
                $table->timestamp('email_verified_at')->nullable();
                $table->string('password');
                $table->string('role', 20)->default('user'); // Role-based access control
                $table->rememberToken();
                $table->timestamps();
            });
            Log::info("[Arkzen Auth] ✓ Created table: {$usersTable}");
        }

        // Ensure `role` column exists on pre-existing users tables (idempotent upgrade)
        if (!Schema::connection($dbConn)->hasColumn($usersTable, 'role')) {
            Schema::connection($dbConn)->table($usersTable, function ($table) {
                $table->string('role', 20)->default('user')->after('password');
            });
            Log::info("[Arkzen Auth] ✓ Added `role` column to existing table: {$usersTable}");
        }

        if (!Schema::connection($dbConn)->hasTable($tokensTable)) {
            Schema::connection($dbConn)->create($tokensTable, function ($table) {
                $table->id();
                $table->morphs('tokenable');
                $table->string('name');
                $table->string('token', 64)->unique();
                $table->text('abilities')->nullable();
                $table->timestamp('last_used_at')->nullable();
                $table->timestamp('expires_at')->nullable();
                $table->timestamps();
            });
            Log::info("[Arkzen Auth] ✓ Created table: {$tokensTable}");
        }
    }

    // ─────────────────────────────────────────────
    // GENERATE USER MODEL
    // ─────────────────────────────────────────────

    private static function generateUserModel(string $tatSlug, string $slugNs, string $dbConn, string $prefix): void
    {
        $usersTable = "{$prefix}_users";
        $path       = app_path("Models/Arkzen/{$slugNs}/User.php");

        if (File::exists($path)) {
            Log::info("[Arkzen Auth] ✓ User model already exists for: {$tatSlug}");
            return;
        }

        File::ensureDirectoryExists(app_path("Models/Arkzen/{$slugNs}"));

        $content = "<?php\n\n"
            . "// ============================================================\n"
            . "// ARKZEN GENERATED USER MODEL — {$tatSlug}\n"
            . "// Isolated to: database/arkzen/{$tatSlug}.sqlite\n"
            . "// DO NOT EDIT DIRECTLY.\n"
            . "// ============================================================\n\n"
            . "namespace App\\Models\\Arkzen\\{$slugNs};\n\n"
            . "use Illuminate\\Foundation\\Auth\\User as Authenticatable;\n"
            . "use Illuminate\\Notifications\\Notifiable;\n"
            . "use Laravel\\Sanctum\\HasApiTokens;\n\n"
            . "class User extends Authenticatable\n{\n"
            . "    use HasApiTokens, Notifiable;\n\n"
            . "    protected \$connection = '{$dbConn}';\n\n"
            . "    protected \$table = '{$usersTable}';\n\n"
            . "    protected \$fillable = ['name', 'email', 'password', 'role'];\n\n"
            . "    protected \$hidden = ['password', 'remember_token'];\n\n"
            . "    protected \$casts = [\n"
            . "        'email_verified_at' => 'datetime',\n"
            . "        'password'          => 'hashed',\n"
            . "    ];\n\n"
            . "    // Route Sanctum to this tatemono's own token table\n"
            . "    public function tokens()\n    {\n"
            . "        return \$this->morphMany(PersonalAccessToken::class, 'tokenable');\n"
            . "    }\n}\n";

        File::put($path, $content);
        Log::info("[Arkzen Auth] ✓ User model created: Models/Arkzen/{$slugNs}/User.php");
    }

    // ─────────────────────────────────────────────
    // GENERATE PERSONAL ACCESS TOKEN MODEL
    // ─────────────────────────────────────────────

    private static function generateTokenModel(string $tatSlug, string $slugNs, string $dbConn, string $prefix): void
    {
        $tokensTable = "{$prefix}_personal_access_tokens";
        $path        = app_path("Models/Arkzen/{$slugNs}/PersonalAccessToken.php");

        if (File::exists($path)) {
            Log::info("[Arkzen Auth] ✓ PersonalAccessToken model already exists for: {$tatSlug}");
            return;
        }

        $content = "<?php\n\n"
            . "// ============================================================\n"
            . "// ARKZEN GENERATED PERSONAL ACCESS TOKEN MODEL — {$tatSlug}\n"
            . "// Isolated to: database/arkzen/{$tatSlug}.sqlite\n"
            . "// DO NOT EDIT DIRECTLY.\n"
            . "// ============================================================\n\n"
            . "namespace App\\Models\\Arkzen\\{$slugNs};\n\n"
            . "use Laravel\\Sanctum\\PersonalAccessToken as SanctumToken;\n\n"
            . "class PersonalAccessToken extends SanctumToken\n{\n"
            . "    protected \$connection = '{$dbConn}';\n"
            . "    protected \$table      = '{$tokensTable}';\n"
            . "}\n";

        File::put($path, $content);
        Log::info("[Arkzen Auth] ✓ PersonalAccessToken model created for: {$tatSlug}");
    }

    // ─────────────────────────────────────────────
    // GENERATE AUTH CONTROLLER — tatemono-scoped
    // ─────────────────────────────────────────────

    private static function generateAuthController(string $tatSlug, string $slugNs, string $dbConn, string $prefix): void
    {
        $usersTable = "{$prefix}_users";
        $path       = app_path("Http/Controllers/Arkzen/{$slugNs}/AuthController.php");

        if (File::exists($path)) {
            Log::info("[Arkzen Auth] ✓ AuthController already exists for: {$tatSlug}");
            return;
        }

        File::ensureDirectoryExists(app_path("Http/Controllers/Arkzen/{$slugNs}"));

        $content = "<?php\n\n"
            . "// ============================================================\n"
            . "// ARKZEN GENERATED AUTH CONTROLLER — {$tatSlug}\n"
            . "// Isolated auth: users live in database/arkzen/{$tatSlug}.sqlite\n"
            . "// DO NOT EDIT DIRECTLY.\n"
            . "// ============================================================\n\n"
            . "namespace App\\Http\\Controllers\\Arkzen\\{$slugNs};\n\n"
            . "use Illuminate\\Routing\\Controller;\n"
            . "use Illuminate\\Http\\Request;\n"
            . "use Illuminate\\Http\\JsonResponse;\n"
            . "use Illuminate\\Support\\Facades\\Hash;\n"
            . "use Illuminate\\Validation\\ValidationException;\n"
            . "use Laravel\\Sanctum\\Sanctum;\n"
            . "use App\\Models\\Arkzen\\{$slugNs}\\User;\n"
            . "use App\\Models\\Arkzen\\{$slugNs}\\PersonalAccessToken;\n\n"
            . "class AuthController extends Controller\n{\n"
            . "    public function __construct()\n    {\n"
            . "        // Point Sanctum at this tatemono's own token model for this request\n"
            . "        Sanctum::usePersonalAccessTokenModel(PersonalAccessToken::class);\n"
            . "    }\n\n"
            . "    // ── Register ──────────────────────────────────\n\n"
            . "    public function register(Request \$request): JsonResponse\n    {\n"
            . "        \$validated = \$request->validate([\n"
            . "            'name'     => 'required|string|max:255',\n"
            . "            'email'    => 'required|email|unique:{$dbConn}.{$usersTable},email',\n"
            . "            'password' => 'required|string|min:8|confirmed',\n"
            . "        ]);\n\n"
            . "        \$user = User::create([\n"
            . "            'name'     => \$validated['name'],\n"
            . "            'email'    => \$validated['email'],\n"
            . "            'password' => Hash::make(\$validated['password']),\n"
            . "        ]);\n\n"
            . "        \$token = \$user->createToken('arkzen-token')->plainTextToken;\n\n"
            . "        return response()->json(['user' => \$user, 'token' => \$token], 201);\n"
            . "    }\n\n"
            . "    // ── Login ─────────────────────────────────────\n\n"
            . "    public function login(Request \$request): JsonResponse\n    {\n"
            . "        \$validated = \$request->validate([\n"
            . "            'email'    => 'required|email',\n"
            . "            'password' => 'required|string',\n"
            . "        ]);\n\n"
            . "        \$user = User::where('email', \$validated['email'])->first();\n\n"
            . "        if (!\$user || !Hash::check(\$validated['password'], \$user->password)) {\n"
            . "            throw ValidationException::withMessages([\n"
            . "                'email' => ['The provided credentials are incorrect.'],\n"
            . "            ]);\n"
            . "        }\n\n"
            . "        \$user->tokens()->delete();\n"
            . "        \$token = \$user->createToken('arkzen-token')->plainTextToken;\n\n"
            . "        return response()->json(['user' => \$user, 'token' => \$token]);\n"
            . "    }\n\n"
            . "    // ── Logout ────────────────────────────────────\n\n"
            . "    public function logout(Request \$request): JsonResponse\n    {\n"
            . "        \$request->user()->currentAccessToken()->delete();\n"
            . "        return response()->json(['message' => 'Logged out successfully']);\n"
            . "    }\n\n"
            . "    // ── Me ────────────────────────────────────────\n\n"
            . "    public function me(Request \$request): JsonResponse\n    {\n"
            . "        return response()->json(\$request->user());\n"
            . "    }\n}\n";

        File::put($path, $content);
        Log::info("[Arkzen Auth] ✓ AuthController created: Http/Controllers/Arkzen/{$slugNs}/AuthController.php");
    }

    // ─────────────────────────────────────────────
    // INJECT AUTH ROUTES into routes/modules/{name}.php
    // Prepends to existing file, or creates fresh for auth-only tatemonos
    // ─────────────────────────────────────────────

    private static function injectAuthRoutes(string $tatSlug, string $slugNs): void
    {
        $routeFile = base_path("routes/modules/{$tatSlug}.php");
        $authAlias = "{$slugNs}Auth";

        $authBlock = "\n"
            . "// ── Auth routes — {$tatSlug} ──────────────────────────────────\n"
            . "use App\\Http\\Controllers\\Arkzen\\{$slugNs}\\AuthController as {$authAlias}Controller;\n\n"
            . "Route::middleware(['api'])->prefix('/api/{$tatSlug}/auth')->group(function () {\n"
            . "    Route::post('/register', [{$authAlias}Controller::class, 'register']);\n"
            . "    Route::post('/login',    [{$authAlias}Controller::class, 'login']);\n"
            . "});\n\n"
            . "Route::middleware(['api', 'auth:sanctum'])->prefix('/api/{$tatSlug}/auth')->group(function () {\n"
            . "    Route::post('/logout', [{$authAlias}Controller::class, 'logout']);\n"
            . "    Route::get('/me',      [{$authAlias}Controller::class, 'me']);\n"
            . "});\n"
            . "// ── End auth — {$tatSlug} ─────────────────────────────────────\n";

        if (File::exists($routeFile)) {
            $existing = File::get($routeFile);
            $existing = str_replace(
                "use Illuminate\\Support\\Facades\\Route;",
                "use Illuminate\\Support\\Facades\\Route;\n{$authBlock}",
                $existing
            );
            File::put($routeFile, $existing);
        } else {
            // Auth-only tatemono — no other routes exist yet
            $content = "<?php\n\n"
                . "// ============================================================\n"
                . "// ARKZEN GENERATED ROUTES — {$tatSlug}\n"
                . "// DO NOT EDIT DIRECTLY.\n"
                . "// ============================================================\n\n"
                . "use Illuminate\\Support\\Facades\\Route;\n"
                . $authBlock;

            File::ensureDirectoryExists(base_path('routes/modules'));
            File::put($routeFile, $content);
        }

        Log::info("[Arkzen Auth] ✓ Auth routes injected into routes/modules/{$tatSlug}.php");
    }

    // ─────────────────────────────────────────────
    // REMOVE — called by ArkzenEngineController::remove()
    // ─────────────────────────────────────────────

    public static function removeForTatemono(string $tatSlug): void
    {
        $slugNs = EventBuilder::toNamespace($tatSlug);

        $filesToRemove = [
            app_path("Http/Controllers/Arkzen/{$slugNs}/AuthController.php"),
            app_path("Models/Arkzen/{$slugNs}/User.php"),
            app_path("Models/Arkzen/{$slugNs}/PersonalAccessToken.php"),
        ];

        foreach ($filesToRemove as $file) {
            if (File::exists($file)) {
                File::delete($file);
                Log::info("[Arkzen Auth] ✓ Removed: {$file}");
            }
        }

        Log::info("[Arkzen Auth] ✓ Auth artifacts removed for: {$tatSlug}");
    }
}