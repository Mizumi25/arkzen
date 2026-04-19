<?php

// ============================================================
// ARKZEN ENGINE — AUTH BUILDER v2.7 (PER-TATEMONO)
// v2.7: Broadcasting auth uses direct HMAC signing instead of
//       Broadcast::auth() — which re-resolves the user via the
//       default guard (App\Models\User) and ignores the already-
//       authenticated tatemono-isolated $request->user().
//       Also self-heals existing route files that still have the
//       old Broadcast::auth() closure.
// v2.6: Broadcasting auth route moved inside the auth:sanctum prefix.
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;

class AuthBuilder
{
    public static function buildForTatemono(array $module): void
    {
        $name   = $module['name'];
        $dbConn = ModelBuilder::slugToConnection($name);
        $slugNs = EventBuilder::toNamespace($name);
        $prefix = str_replace('-', '_', $name);

        Log::info("[Arkzen Auth] Building isolated auth for: {$name}");

        MigrationBuilder::ensureDatabase($name, $dbConn);
        self::migrateAuthTables($dbConn, $prefix);
        self::generateUserModel($name, $slugNs, $dbConn, $prefix);
        self::generateTokenModel($name, $slugNs, $dbConn, $prefix);
        self::generateNotificationModel($name, $slugNs, $dbConn, $prefix);
        self::generateAuthController($name, $slugNs, $dbConn, $prefix);
        self::injectAuthRoutes($name, $slugNs);

        Log::info("[Arkzen Auth] ✓ Isolated auth complete for: {$name}");
    }

    private static function migrateAuthTables(string $dbConn, string $prefix): void
    {
        $usersTable         = "{$prefix}_users";
        $tokensTable        = "{$prefix}_personal_access_tokens";
        $notificationsTable = "{$prefix}_notifications";

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

        File::put($path, $content);
        Log::info("[Arkzen Auth] ✓ User model created: Models/Arkzen/{$slugNs}/User.php");
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
    // BROADCASTING AUTH CLOSURE
    //
    // Reverb speaks the Pusher wire protocol. Authenticating a private
    // channel requires signing "{socket_id}:{channel_name}" with
    // REVERB_APP_SECRET (HMAC-SHA256) and returning:
    //   {"auth": "{app_key}:{signature}"}
    //
    // We implement this directly instead of using Broadcast::auth()
    // because Broadcast::auth() resolves the user via Auth::guard()
    // using config/auth.php's default provider (App\Models\User),
    // completely ignoring $request->user() which ArkzenSanctumTokenResolver
    // + auth:sanctum have already correctly resolved to the tatemono user.
    // ============================================================
    private static function broadcastingAuthClosure(): string
    {
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
            . "        // Verify the user owns this private channel.\n"
            . "        // Channel name format sent by Reverb: private-{slug}.{userId}\n"
            . "        \$channelUserId = (int) preg_replace('/.*\\.([0-9]+)\$/', '\$1', \$channelName);\n"
            . "        if (\$channelUserId !== (int) \$user->id) {\n"
            . "            return response()->json(['message' => 'Forbidden.'], 403);\n"
            . "        }\n"
            . "\n"
            . "        // Sign the handshake — Reverb/Pusher wire protocol.\n"
            . "        \$secret    = config('reverb.apps.apps.0.secret', env('REVERB_APP_SECRET'));\n"
            . "        \$appKey    = config('reverb.apps.apps.0.key',    env('REVERB_APP_KEY'));\n"
            . "        \$signature = hash_hmac('sha256', \"\$socketId:\$channelName\", \$secret);\n"
            . "\n"
            . "        return response()->json(['auth' => \"\$appKey:\$signature\"]);\n"
            . "    });\n";
    }

        private static function injectAuthRoutes(string $tatSlug, string $slugNs): void
    {
        $routeFile        = base_path("routes/modules/{$tatSlug}.php");
        $authAlias        = "{$slugNs}Auth";
        $broadcastClosure = self::broadcastingAuthClosure();
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
            . $broadcastClosure
            . "});\n"
            . "// ── End auth — {$tatSlug} ─────────────────────────────────────\n";
    
        if (!File::exists($routeFile)) {
            // Fresh file – write full content with auth block
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
    
        // File exists – check if auth routes are already present
        $existing = File::get($routeFile);
        $authMarker = "// ── Auth routes — {$tatSlug} ──";
    
        if (str_contains($existing, $authMarker)) {
            // Auth block exists – only need to self‑heal broadcasting auth if outdated
            if (str_contains($existing, 'Broadcast::auth($request)')) {
                $existing = preg_replace(
                    "/    Route::post\('\/broadcasting\/auth'.*?\}\);\n/s",
                    $broadcastClosure,
                    $existing
                );
                File::put($routeFile, $existing);
                Log::info("[Arkzen Auth] ✓ Healed broadcasting auth in {$tatSlug}.php");
            }
            return;
        }
    
        // Auth block missing – inject it right after the opening PHP tag
        if (str_starts_with(trim($existing), '<?php')) {
            $existing = preg_replace('/^<\?php/', "<?php\n\n{$authBlock}", $existing);
        } else {
            $existing = "<?php\n\n{$authBlock}\n{$existing}";
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