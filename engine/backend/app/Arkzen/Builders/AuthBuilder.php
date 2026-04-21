<?php

// ============================================================
// ARKZEN ENGINE — AUTH BUILDER v2.13 (PER-TATEMONO)
// v2.13: seedUsers() is now public and called as its own run() step
//        in ArkzenEngineController Phase 6.5 so seed failures surface
//        as a visible ✗ instead of being swallowed inside buildForTatemono.
// v2.12 (kept): seedUsers() seeds the tatemono's isolated users table
//        from auth_seed.users declared in @arkzen:meta. Passwords are
//        hashed via Hash::make(). Seeding is idempotent (updateOrInsert).
// v2.11 (kept): Notification infrastructure conditional on
//        @arkzen:notifications blocks.
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class AuthBuilder
{
    public static function buildForTatemono(array $module): void
    {
        $name             = $module['name'];
        $dbConn           = ModelBuilder::slugToConnection($name);
        $slugNs           = EventBuilder::toNamespace($name);
        $prefix           = str_replace('-', '_', $name);
        $hasNotifications = !empty($module['notifications']);

        Log::info("[Arkzen Auth] Building isolated auth for: {$name} (notifications: " . ($hasNotifications ? 'yes' : 'no') . ")");

        MigrationBuilder::ensureDatabase($name, $dbConn);
        self::migrateAuthTables($dbConn, $prefix, $hasNotifications);
        self::generateUserModel($name, $slugNs, $dbConn, $prefix, $hasNotifications);
        self::generateTokenModel($name, $slugNs, $dbConn, $prefix);

        if ($hasNotifications) {
            self::generateNotificationModel($name, $slugNs, $dbConn, $prefix);
        }

        self::generateAuthController($name, $slugNs, $dbConn, $prefix);
        self::injectAuthRoutes($name, $slugNs);

        Log::info("[Arkzen Auth] ✓ Isolated auth complete for: {$name}");
    }

    // ─────────────────────────────────────────────
    // Called from ArkzenEngineController Phase 6.5
    // when a tatemono has auth + notifications but
    // no @arkzen:realtime blocks — ensures the private
    // notification channel is always registered in
    // channels.php regardless of realtime presence.
    // ─────────────────────────────────────────────
    public static function buildAuthChannel(array $module): void
    {
        if (empty($module['notifications'])) return;
        ChannelBuilder::buildAuthChannel($module);
    }

    // ─────────────────────────────────────────────
    // SEED USERS — v2.13 PUBLIC ENTRY POINT
    // Called as its own run() step in ArkzenEngineController
    // Phase 6.5 so failures are visible in the build log.
    // ─────────────────────────────────────────────

    public static function seedUsersForTatemono(array $module): void
    {
        if (empty($module['authSeed']['users'])) return;

        $name   = $module['name'];
        $dbConn = ModelBuilder::slugToConnection($name);
        $prefix = str_replace('-', '_', $name);

        self::seedUsers($dbConn, $prefix, $module['authSeed']['users']);
    }

    // ─────────────────────────────────────────────
    // SEED USERS — v2.12
    // Seeds the tatemono's isolated users table from
    // auth_seed.users declared in @arkzen:meta.
    // Idempotent: uses updateOrInsert keyed on email,
    // so rebuilding the tatemono won't duplicate users.
    // Passwords are hashed — never stored plain.
    // ─────────────────────────────────────────────

    public static function seedUsers(string $dbConn, string $prefix, array $users): void
    {
        $usersTable = "{$prefix}_users";

        foreach ($users as $user) {
            $email = $user['email'] ?? null;
            if (!$email) continue;

            DB::connection($dbConn)->table($usersTable)->updateOrInsert(
                ['email' => $email],
                [
                    'name'       => $user['name']     ?? $email,
                    'email'      => $email,
                    'password'   => Hash::make($user['password'] ?? 'password'),
                    'role'       => $user['role']     ?? 'user',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            Log::info("[Arkzen Auth] ✓ Seeded user: {$email} (role: " . ($user['role'] ?? 'user') . ")");
        }
    }

    private static function migrateAuthTables(string $dbConn, string $prefix, bool $hasNotifications): void
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
                $table->string('role', 20)->default('user');
                $table->rememberToken();
                $table->timestamps();
            });
            Log::info("[Arkzen Auth] ✓ Created table: {$usersTable}");
        }

        if (!Schema::connection($dbConn)->hasColumn($usersTable, 'role')) {
            Schema::connection($dbConn)->table($usersTable, function ($table) {
                $table->string('role', 20)->default('user')->after('password');
            });
            Log::info("[Arkzen Auth] ✓ Added `role` column to: {$usersTable}");
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

        // Notifications table — only when @arkzen:notifications is declared
        if ($hasNotifications) {
            $notificationsTable = "{$prefix}_notifications";
            if (!Schema::connection($dbConn)->hasTable($notificationsTable)) {
                Schema::connection($dbConn)->create($notificationsTable, function ($table) {
                    $table->uuid('id')->primary();
                    $table->string('type');
                    $table->morphs('notifiable');
                    $table->text('data');
                    $table->timestamp('read_at')->nullable();
                    $table->timestamps();
                });
                Log::info("[Arkzen Auth] ✓ Created table: {$notificationsTable}");
            }
        }
    }

    private static function generateUserModel(string $tatSlug, string $slugNs, string $dbConn, string $prefix, bool $hasNotifications): void
    {
        $usersTable = "{$prefix}_users";
        $path       = app_path("Models/Arkzen/{$slugNs}/User.php");

        // Always regenerate — DSL may have toggled notifications on/off
        File::ensureDirectoryExists(app_path("Models/Arkzen/{$slugNs}"));

        if ($hasNotifications) {
            $content = "<?php\n\n"
                . "// ============================================================\n"
                . "// ARKZEN GENERATED USER MODEL — {$tatSlug}\n"
                . "// Isolated to: database/arkzen/{$tatSlug}.sqlite\n"
                . "// Notifications: ENABLED (Notifiable trait + relations)\n"
                . "// DO NOT EDIT DIRECTLY.\n"
                . "// ============================================================\n\n"
                . "namespace App\\Models\\Arkzen\\{$slugNs};\n\n"
                . "use Illuminate\\Foundation\\Auth\\User as Authenticatable;\n"
                . "use Illuminate\\Notifications\\Notifiable;\n"
                . "use Laravel\\Sanctum\\HasApiTokens;\n"
                . "use Illuminate\\Database\\Eloquent\\Relations\\Relation;\n"
                . "use App\\Models\\Arkzen\\{$slugNs}\\DatabaseNotification;\n\n"
                . "Relation::morphMap([\n"
                . "    'notifiable' => DatabaseNotification::class,\n"
                . "]);\n\n"
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
                . "    public function tokens()\n    {\n"
                . "        return \$this->morphMany(PersonalAccessToken::class, 'tokenable');\n"
                . "    }\n\n"
                . "    public function notifications()\n    {\n"
                . "        return \$this->morphMany(DatabaseNotification::class, 'notifiable')\n"
                . "            ->orderBy('created_at', 'desc');\n"
                . "    }\n\n"
                . "    public function unreadNotifications()\n    {\n"
                . "        return \$this->notifications()->whereNull('read_at');\n"
                . "    }\n"
                . "}\n";
        } else {
            // Lean model — no Notifiable, no notification relations, no unused imports
            $content = "<?php\n\n"
                . "// ============================================================\n"
                . "// ARKZEN GENERATED USER MODEL — {$tatSlug}\n"
                . "// Isolated to: database/arkzen/{$tatSlug}.sqlite\n"
                . "// Notifications: DISABLED (no @arkzen:notifications declared)\n"
                . "// DO NOT EDIT DIRECTLY.\n"
                . "// ============================================================\n\n"
                . "namespace App\\Models\\Arkzen\\{$slugNs};\n\n"
                . "use Illuminate\\Foundation\\Auth\\User as Authenticatable;\n"
                . "use Laravel\\Sanctum\\HasApiTokens;\n\n"
                . "class User extends Authenticatable\n{\n"
                . "    use HasApiTokens;\n\n"
                . "    protected \$connection = '{$dbConn}';\n\n"
                . "    protected \$table = '{$usersTable}';\n\n"
                . "    protected \$fillable = ['name', 'email', 'password', 'role'];\n\n"
                . "    protected \$hidden = ['password', 'remember_token'];\n\n"
                . "    protected \$casts = [\n"
                . "        'email_verified_at' => 'datetime',\n"
                . "        'password'          => 'hashed',\n"
                . "    ];\n\n"
                . "    public function tokens()\n    {\n"
                . "        return \$this->morphMany(PersonalAccessToken::class, 'tokenable');\n"
                . "    }\n"
                . "}\n";
        }

        File::put($path, $content);
        Log::info("[Arkzen Auth] ✓ User model written: Models/Arkzen/{$slugNs}/User.php (notifications: " . ($hasNotifications ? 'yes' : 'no') . ")");
    }

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

    private static function generateNotificationModel(string $tatSlug, string $slugNs, string $dbConn, string $prefix): void
    {
        $notificationsTable = "{$prefix}_notifications";
        $path               = app_path("Models/Arkzen/{$slugNs}/DatabaseNotification.php");

        if (File::exists($path)) {
            Log::info("[Arkzen Auth] ✓ DatabaseNotification model already exists for: {$tatSlug}");
            return;
        }

        $content = "<?php\n\n"
            . "// ============================================================\n"
            . "// ARKZEN GENERATED DATABASE NOTIFICATION MODEL — {$tatSlug}\n"
            . "// Isolated to: database/arkzen/{$tatSlug}.sqlite\n"
            . "// DO NOT EDIT DIRECTLY.\n"
            . "// ============================================================\n\n"
            . "namespace App\\Models\\Arkzen\\{$slugNs};\n\n"
            . "use Illuminate\\Notifications\\DatabaseNotification as BaseDatabaseNotification;\n\n"
            . "class DatabaseNotification extends BaseDatabaseNotification\n{\n"
            . "    protected \$connection = '{$dbConn}';\n"
            . "    protected \$table      = '{$notificationsTable}';\n\n"
            . "    protected static function boot()\n    {\n"
            . "        parent::boot();\n\n"
            . "        static::creating(function (\$model) {\n"
            . "            if (empty(\$model->type)) {\n"
            . "                \$model->type = 'notifiable';\n"
            . "            }\n"
            . "        });\n"
            . "    }\n"
            . "}\n";

        File::put($path, $content);
        Log::info("[Arkzen Auth] ✓ DatabaseNotification model created: Models/Arkzen/{$slugNs}/DatabaseNotification.php");
    }

    private static function generateAuthController(string $tatSlug, string $slugNs, string $dbConn, string $prefix): void
    {
        $path = app_path("Http/Controllers/Arkzen/{$slugNs}/AuthController.php");

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
            . "        Sanctum::usePersonalAccessTokenModel(PersonalAccessToken::class);\n"
            . "    }\n\n"
            . "    public function register(Request \$request): JsonResponse\n    {\n"
            . "        \$validated = \$request->validate([\n"
            . "            'name'     => 'required|string|max:255',\n"
            . "            'email'    => 'required|email|unique:App\\\\Models\\\\Arkzen\\\\{$slugNs}\\\\User,email',\n"
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
            . "    public function logout(Request \$request): JsonResponse\n    {\n"
            . "        \$request->user()->currentAccessToken()->delete();\n"
            . "        return response()->json(['message' => 'Logged out successfully']);\n"
            . "    }\n\n"
            . "    public function me(Request \$request): JsonResponse\n    {\n"
            . "        return response()->json(\$request->user());\n"
            . "    }\n"
            . "}\n";

        File::put($path, $content);
        Log::info("[Arkzen Auth] ✓ AuthController created: Http/Controllers/Arkzen/{$slugNs}/AuthController.php");
    }

    // ============================================================
    // BROADCASTING AUTH CLOSURE (v2.10)
    // Signs "{socket_id}:{channel_name}" with REVERB_APP_SECRET
    // (HMAC-SHA256). User ID extracted via str_starts_with + substr.
    // ============================================================
    private static function broadcastingAuthClosure(string $tatSlug): string
    {
        // Builds the /broadcasting/auth route closure.
        //
        // Handles two channel types:
        //   private-{slug}.{userId}   → HMAC of "socketId:channelName"
        //   presence-{slug}-*         → HMAC of "socketId:channelName:channelData"
        //                               response also includes channel_data so Reverb
        //                               can track the member roster.
        //
        // Any other prefix is rejected with 403.
        return "    Route::post('/broadcasting/auth', function (\\Illuminate\\Http\\Request \$request) {\n"
            . "        \$user = \$request->user();\n"
            . "        if (!\$user) {\n"
            . "            return response()->json(['message' => 'Unauthenticated.'], 401);\n"
            . "        }\n"
            . "\n"
            . "        \$socketId    = \$request->input('socket_id');\n"
            . "        \$channelName = \$request->input('channel_name');\n"
            . "\n"
            . "        if (!\$socketId || !\$channelName) {\n"
            . "            return response()->json(['message' => 'Missing socket_id or channel_name.'], 422);\n"
            . "        }\n"
            . "\n"
            . "        \$secret = config('reverb.apps.apps.0.secret', env('REVERB_APP_SECRET'));\n"
            . "        \$appKey = config('reverb.apps.apps.0.key',    env('REVERB_APP_KEY'));\n"
            . "\n"
            . "        // ── Presence channel ──────────────────────────────────────────\n"
            . "        // Channel name: presence-{$tatSlug}-*\n"
            . "        // Reverb requires the HMAC to cover socketId:channelName:channelData\n"
            . "        // and the response must include channel_data for the member roster.\n"
            . "        if (str_starts_with(\$channelName, 'presence-{$tatSlug}')) {\n"
            . "            \$channelData = json_encode([\n"
            . "                'user_id'   => \$user->id,\n"
            . "                'user_info' => ['name' => \$user->name ?? \$user->email],\n"
            . "            ]);\n"
            . "            \$signature = hash_hmac('sha256', \"\$socketId:\$channelName:\$channelData\", \$secret);\n"
            . "            return response()->json([\n"
            . "                'auth'         => \"\$appKey:\$signature\",\n"
            . "                'channel_data' => \$channelData,\n"
            . "            ]);\n"
            . "        }\n"
            . "\n"
            . "        // ── Private channel ───────────────────────────────────────────\n"
            . "        // Channel name: private-{$tatSlug}.{userId}\n"
            . "        // Verify user owns the channel, then sign socketId:channelName.\n"
            . "        \$expectedPrefix = 'private-{$tatSlug}.';\n"
            . "        if (!str_starts_with(\$channelName, \$expectedPrefix)) {\n"
            . "            return response()->json(['message' => 'Invalid channel prefix.'], 403);\n"
            . "        }\n"
            . "\n"
            . "        \$channelUserId = (int) substr(\$channelName, strlen(\$expectedPrefix));\n"
            . "        if (\$channelUserId !== (int) \$user->id) {\n"
            . "            return response()->json(['message' => 'Forbidden.'], 403);\n"
            . "        }\n"
            . "\n"
            . "        \$signature = hash_hmac('sha256', \"\$socketId:\$channelName\", \$secret);\n"
            . "        return response()->json(['auth' => \"\$appKey:\$signature\"]);\n"
            . "    });\n";
    }
    private static function buildAuthBlock(string $tatSlug, string $slugNs): string
    {
        $authAlias        = "{$slugNs}Auth";
        $broadcastClosure = self::broadcastingAuthClosure($tatSlug);

        return "\n"
            . "// ── Auth routes — {$tatSlug} ──────────────────────────────────\n"
            . "use App\\Http\\Controllers\\Arkzen\\{$slugNs}\\AuthController as {$authAlias}Controller;\n\n"
            . "Route::middleware(['api'])->prefix('/api/{$tatSlug}/auth')->group(function () {\n"
            . "    Route::post('/register', [{$authAlias}Controller::class, 'register']);\n"
            . "    Route::post('/login',    [{$authAlias}Controller::class, 'login']);\n"
            . "});\n\n"
            . "Route::middleware(['api', 'auth:sanctum'])->prefix('/api/{$tatSlug}/auth')->group(function () {\n"
            . "    Route::post('/logout', [{$authAlias}Controller::class, 'logout']);\n"
            . "    Route::get('/me',      [{$authAlias}Controller::class, 'me']);\n"
            . $broadcastClosure
            . "});\n"
            . "// ── End auth — {$tatSlug} ─────────────────────────────────────\n";
    }

    private static function injectAuthRoutes(string $tatSlug, string $slugNs): void
    {
        $routeFile   = base_path("routes/modules/{$tatSlug}.php");
        $authBlock   = self::buildAuthBlock($tatSlug, $slugNs);
        $authMarker  = "// ── Auth routes — {$tatSlug} ──";

        if (!File::exists($routeFile)) {
            $content = "<?php\n\n"
                . "// ============================================================\n"
                . "// ARKZEN GENERATED ROUTES — {$tatSlug}\n"
                . "// DO NOT EDIT DIRECTLY.\n"
                . "// ============================================================\n\n"
                . "use Illuminate\\Support\\Facades\\Route;\n"
                . $authBlock;
            File::ensureDirectoryExists(base_path('routes/modules'));
            File::put($routeFile, $content);
            Log::info("[Arkzen Auth] ✓ Auth routes injected into new route file: {$tatSlug}.php");
            return;
        }

        $existing = File::get($routeFile);

        // v2.9 PRE-PASS — strip stray Broadcast::auth() route groups
        if (str_contains($existing, 'Broadcast::auth(')) {
            $existing = preg_replace(
                '/\/\/ ── Broadcasting auth \(tatemono-scoped\).*?Route::middleware\([^\)]+\)\s*->post\([^;]+Broadcast::auth[^;]+;\s*/s',
                '',
                $existing
            );
            $existing = preg_replace(
                '/Route::middleware\(\[\'api\',\s*\'auth:sanctum\'\]\)\s*->post\(\s*[\'"]api\/' . preg_quote($tatSlug, '/') . '\/auth\/broadcasting\/auth[\'"]\s*,\s*function[^}]+Broadcast::auth[^}]+\}\s*\)\s*;\s*/s',
                '',
                $existing
            );
            Log::info("[Arkzen Auth] ✓ Stripped stray Broadcast::auth() route from {$tatSlug}.php");
        }

        // v2.10 HEAL old regex capture bug
        if (str_contains($existing, "preg_replace('/.*\\.([0-9]+)\$/', ''")) {
            $existing = str_replace(
                "preg_replace('/.*\\.([0-9]+)\$/', ''",
                "preg_replace('/.*\\.([0-9]+)\$/', '\\1'",
                $existing
            );
            Log::info("[Arkzen Auth] ✓ Healed regex capture bug in {$tatSlug}.php");
        }

        if (str_contains($existing, $authMarker)) {
            $needsHeal = str_contains($existing, 'Broadcast::auth(')
                || !str_contains($existing, "Route::post('/broadcasting/auth'");

            if ($needsHeal) {
                $existing = preg_replace(
                    '/\/\/ ── Auth routes — ' . preg_quote($tatSlug, '/') . ' ──.*?\/\/ ── End auth — ' . preg_quote($tatSlug, '/') . ' ─+\n/s',
                    ltrim($authBlock),
                    $existing
                );
                File::put($routeFile, $existing);
                Log::info("[Arkzen Auth] ✓ Healed auth block in {$tatSlug}.php");
            } else {
                File::put($routeFile, $existing);
                Log::info("[Arkzen Auth] ✓ Auth block already canonical in {$tatSlug}.php");
            }
            return;
        }

        if (str_starts_with(trim($existing), '<?php')) {
            $existing = preg_replace('/^<\?php/', "<?php\n\n" . ltrim($authBlock), $existing);
        } else {
            $existing = "<?php\n\n" . ltrim($authBlock) . "\n" . $existing;
        }
        File::put($routeFile, $existing);
        Log::info("[Arkzen Auth] ✓ Auth routes added to existing route file: {$tatSlug}.php");
    }

    public static function removeForTatemono(string $tatSlug): void
    {
        $slugNs = EventBuilder::toNamespace($tatSlug);

        $filesToRemove = [
            app_path("Http/Controllers/Arkzen/{$slugNs}/AuthController.php"),
            app_path("Models/Arkzen/{$slugNs}/User.php"),
            app_path("Models/Arkzen/{$slugNs}/PersonalAccessToken.php"),
            app_path("Models/Arkzen/{$slugNs}/DatabaseNotification.php"),
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