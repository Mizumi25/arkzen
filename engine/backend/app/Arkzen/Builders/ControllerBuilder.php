<?php

// ============================================================
// ARKZEN ENGINE — CONTROLLER BUILDER v5.6
// FIXED v5.4: Now uses Resource class when resource: true is set
// FIXED v5.5: Role endpoint generators rewritten for real Sanctum auth.
// FIXED v5.6: Added 'run' endpoint support for scheduler-test commands
//   generateCommandRun() executes Artisan commands and records results
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class ControllerBuilder
{
    public static function build(array $module): void
    {
        $api            = $module['api'];
        $name           = $module['name'];                          // tatemono slug e.g. inventory-management
        $slugNs         = EventBuilder::toNamespace($name);        // e.g. InventoryManagement
        $controllerName = $api['controller'];
        $modelName      = $api['model'];
        $endpoints      = $api['endpoints'];
        $useResource    = $api['resource'] ?? false;
        
        $filePath       = app_path("Http/Controllers/Arkzen/{$slugNs}/{$controllerName}.php");

        File::ensureDirectoryExists(app_path("Http/Controllers/Arkzen/{$slugNs}"));

        $methods = self::generateMethods($modelName, $endpoints, $slugNs, $useResource);

        $resourceImport = $useResource 
            ? "use App\\Http\\Resources\\Arkzen\\{$slugNs}\\{$modelName}Resource;\n" 
            : '';

        $content = "<?php

// ============================================================
// ARKZEN GENERATED CONTROLLER — {$controllerName}
// Tatemono: {$name}
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// ============================================================

namespace App\Http\Controllers\Arkzen\\{$slugNs};

use Illuminate\Routing\Controller;
use App\Models\Arkzen\\{$slugNs}\\{$modelName};
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
{$resourceImport}
class {$controllerName} extends Controller
{
{$methods}
}
";

        File::put($filePath, $content);
        Log::info("[Arkzen Controller] ✓ Controller created: {$slugNs}/{$controllerName}");
    }

    // ─────────────────────────────────────────────
    // GENERATE METHODS
    // ─────────────────────────────────────────────

    private static function generateMethods(string $modelName, array $endpoints, string $slugNs, bool $useResource): string
    {
        $methods = [];
        foreach ($endpoints as $name => $endpoint) {
            $methods[] = self::generateMethod($name, $modelName, $endpoint, $slugNs, $useResource);
        }
        return implode("\n\n", $methods);
    }

    private static function generateMethod(string $name, string $modelName, array $endpoint, string $slugNs, bool $useResource): string
    {
        return match ($name) {
            'index'   => self::generateIndex($modelName, $endpoint, $slugNs, $useResource),
            'show'    => self::generateShow($modelName, $endpoint, $slugNs, $useResource),
            'store' => match ($endpoint['type'] ?? '') {
                'upload'      => self::generateUploadStore($modelName, $endpoint),
                'command_run' => self::generateCommandRun($modelName, $endpoint),
                'job_dispatch' => self::generateJobDispatch($modelName, $endpoint),
                'event_fire' => self::generateEventFire($modelName, $endpoint),
                'broadcast' => self::generateBroadcast($modelName, $slugNs, $endpoint),
                 'mail_send'      => self::generateMailSend($modelName, $endpoint, $slugNs),
                 'notification_trigger' => self::generateNotificationTrigger($modelName, $endpoint, $slugNs),
                default       => self::generateStore($modelName, $endpoint, $slugNs, $useResource),
            },
            'destroy' => match ($endpoint['type'] ?? '') {
                'upload_destroy' => self::generateUploadDestroy($modelName, $endpoint),
                default          => self::generateDestroy($modelName, $endpoint),
            },
            'fileUrl'    => self::generateUploadUrl($modelName, $endpoint),
            'me'         => self::generateCustomMethod($name, $modelName, $endpoint),
            'adminOnly'  => self::generateRoleAdminOnly($modelName, $endpoint),
            'userOnly'   => self::generateRoleUserOnly($modelName, $endpoint),
            'promote'    => self::generateRolePromote($endpoint),
            'demote'     => self::generateRoleDemote($endpoint),
            'run'        => self::generateCommandRun($modelName, $endpoint),
            default      => self::generateCustomMethod($name, $modelName, $endpoint),
        };
    }

    // ─────────────────────────────────────────────
    // INDEX — FIXED to use Resource
    // ─────────────────────────────────────────────

    private static function generateIndex(string $model, array $endpoint, string $slugNs, bool $useResource): string
    {
        $query        = $endpoint['query'] ?? [];
        $searchFields = self::detectSearchFields($query);
        $perPage      = self::extractDefault($query['per_page'] ?? 'integer|default:15');
        $resourceClass = $useResource ? "{$model}Resource::class" : 'null';
        $resourceCollection = $useResource ? "{$model}Resource::collection" : '';

        $searchLogic = '';
        if ($searchFields) {
            $searchLogic = "\n        if (\$request->filled('search')) {\n            \$query->where(function (\$q) use (\$request) {\n                " . implode("\n                ", array_map(
                fn($f) => "\$q->orWhere('{$f}', 'like', '%' . \$request->search . '%');",
                $searchFields
            )) . "\n            });\n        }";
        }

        $filterLogic = self::generateFilterLogic($query);

        if ($useResource) {
            return "    /**
     * {$endpoint['description']}
     */
    public function index(Request \$request): JsonResponse
    {
        \$query = {$model}::query();
{$searchLogic}
{$filterLogic}
        \$perPage = \$request->get('per_page', {$perPage});
        \$results = \$query->paginate(\$perPage);

        return response()->json({$model}Resource::collection(\$results));
    }";
        }

        return "    /**
     * {$endpoint['description']}
     */
    public function index(Request \$request): JsonResponse
    {
        \$query = {$model}::query();
{$searchLogic}
{$filterLogic}
        \$perPage = \$request->get('per_page', {$perPage});
        \$results = \$query->paginate(\$perPage);

        return response()->json(\$results);
    }";
    }

    // ─────────────────────────────────────────────
    // SHOW — FIXED to use Resource
    // ─────────────────────────────────────────────

    private static function generateShow(string $model, array $endpoint, string $slugNs, bool $useResource): string
    {
        $varName = lcfirst($model);
        
        if ($useResource) {
            return "    /**
     * {$endpoint['description']}
     */
    public function show({$model} \${$varName}): JsonResponse
    {
        return response()->json(new {$model}Resource(\${$varName}));
    }";
        }

        return "    /**
     * {$endpoint['description']}
     */
    public function show({$model} \${$varName}): JsonResponse
    {
        return response()->json(\${$varName});
    }";
    }

    // ─────────────────────────────────────────────
    // STORE — FIXED to use Resource
    // ─────────────────────────────────────────────

    private static function generateStore(string $model, array $endpoint, string $slugNs, bool $useResource): string
    {
        $validation = self::generateValidation($endpoint['validation'] ?? []);
        $varName    = lcfirst($model);

        if ($useResource) {
            return "    /**
     * {$endpoint['description']}
     */
    public function store(Request \$request): JsonResponse
    {
        \$validated = \$request->validate([
{$validation}
        ]);

        \${$varName} = {$model}::create(\$validated);

        return response()->json(new {$model}Resource(\${$varName}), 201);
    }";
        }

        return "    /**
     * {$endpoint['description']}
     */
    public function store(Request \$request): JsonResponse
    {
        \$validated = \$request->validate([
{$validation}
        ]);

        \${$varName} = {$model}::create(\$validated);

        return response()->json(\${$varName}, 201);
    }";
    }

    // ─────────────────────────────────────────────
    // UPDATE — FIXED to use Resource
    // ─────────────────────────────────────────────

    private static function generateUpdate(string $model, array $endpoint, string $slugNs, bool $useResource): string
    {
        $validation = self::generateValidation($endpoint['validation'] ?? []);
        $varName    = lcfirst($model);

        if ($useResource) {
            return "    /**
     * {$endpoint['description']}
     */
    public function update(Request \$request, {$model} \${$varName}): JsonResponse
    {
        \$validated = \$request->validate([
{$validation}
        ]);

        \${$varName}->update(\$validated);

        return response()->json(new {$model}Resource(\${$varName}));
    }";
        }

        return "    /**
     * {$endpoint['description']}
     */
    public function update(Request \$request, {$model} \${$varName}): JsonResponse
    {
        \$validated = \$request->validate([
{$validation}
        ]);

        \${$varName}->update(\$validated);

        return response()->json(\${$varName});
    }";
    }

    // ─────────────────────────────────────────────
    // DESTROY — unchanged
    // ─────────────────────────────────────────────

    private static function generateDestroy(string $model, array $endpoint): string
    {
        $varName = lcfirst($model);
        $message = $endpoint['response']['value'] ?? "{$model} deleted successfully";

        return "    /**
     * {$endpoint['description']}
     */
    public function destroy({$model} \${$varName}): JsonResponse
    {
        \${$varName}->delete();

        return response()->json(['message' => '{$message}']);
    }";
    }

    // ─────────────────────────────────────────────
    // CUSTOM METHOD
    // ─────────────────────────────────────────────

    private static function generateCustomMethod(string $name, string $model, array $endpoint): string
    {
        return "    /**
     * {$endpoint['description']}
     */
    public function {$name}(Request \$request): JsonResponse
    {
        // Custom endpoint: {$name}
        // Implement logic here
        return response()->json(['message' => 'Not implemented']);
    }";
    }

    // ─────────────────────────────────────────────
    // UPLOAD STORE — handles multipart file uploads
    // ─────────────────────────────────────────────

    private static function generateUploadStore(string $model, array $endpoint): string
    {
        $description = $endpoint['description'] ?? 'Upload files';
        $validation  = self::generateValidation($endpoint['validation'] ?? [
            'files'   => 'required|array',
            'files.*' => 'file|max:10240',
        ]);

        return "    /**
     * {$description}
     */
    public function store(Request \$request): JsonResponse
    {
        \$request->validate([
{$validation}
        ]);

        \$uploaded = [];

        foreach (\$request->file('files', []) as \$file) {
            \$originalName = \$file->getClientOriginalName();
            \$storedName   = \$file->store('arkzen/' . \$this->tatemonoSlug(), 'public');
            \$isImage      = str_starts_with(\$file->getMimeType(), 'image/');

            \$record = {$model}::create([
                'user_id'       => auth()->id(),
                'original_name' => \$originalName,
                'stored_name'   => basename(\$storedName),
                'mime_type'     => \$file->getMimeType(),
                'size_bytes'    => \$file->getSize(),
                'disk_path'     => \$storedName,
                'is_image'      => \$isImage,
            ]);

            if (\$isImage) {
                \$record->url = \Storage::url(\$storedName);
            }

            \$uploaded[] = \$record;
        }

        return response()->json(['data' => \$uploaded], 201);
    }";
    }

    // ─────────────────────────────────────────────
    // UPLOAD DESTROY — deletes file from disk + DB
    // ─────────────────────────────────────────────

    private static function generateUploadDestroy(string $model, array $endpoint): string
    {
        $description = $endpoint['description'] ?? 'Delete file';
        $varName     = lcfirst($model);

        return "    /**
     * {$description}
     */
    public function destroy({$model} \${$varName}): JsonResponse
    {
        if (\Storage::disk('public')->exists(\${$varName}->disk_path)) {
            \Storage::disk('public')->delete(\${$varName}->disk_path);
        }

        \${$varName}->delete();

        return response()->json(['message' => 'File deleted']);
    }";
    }

    // ─────────────────────────────────────────────
    // UPLOAD URL — returns public URL or download
    // ─────────────────────────────────────────────

    private static function generateUploadUrl(string $model, array $endpoint): string
    {
        $description = $endpoint['description'] ?? 'Get file URL';
        $varName     = lcfirst($model);

        return "    /**
     * {$description}
     */
    public function fileUrl({$model} \${$varName}): JsonResponse
    {
        if (!\Storage::disk('public')->exists(\${$varName}->disk_path)) {
            return response()->json(['message' => 'File not found'], 404);
        }

        return response()->json([
            'url'  => \Storage::url(\${$varName}->disk_path),
            'name' => \${$varName}->original_name,
        ]);
    }

    // ─────────────────────────────────────────────
    // HELPER
    // ─────────────────────────────────────────────

    private function tatemonoSlug(): string
    {
        // Derives the tatemono slug from the controller namespace
        // e.g. App\Http\Controllers\Arkzen\UploadTest\... → upload-test
        \$ns    = class_basename(static::class);
        \$parts = preg_split('/(?=[A-Z])/', \$ns, -1, PREG_SPLIT_NO_EMPTY);
        return strtolower(implode('-', \$parts));
    }";
    }

    // ─────────────────────────────────────────────
    // ROLE ME — DEPRECATED in v5.5
    // ─────────────────────────────────────────────

    /** @deprecated Use AuthBuilder's /auth/me instead */
    private static function generateRoleMe(array $endpoint): string
    {
        return self::generateCustomMethod('me', 'User', $endpoint);
    }

    // ─────────────────────────────────────────────
    // ROLE ADMIN ONLY — Sanctum auth + role check
    // ─────────────────────────────────────────────

    private static function generateRoleAdminOnly(string $model, array $endpoint): string
    {
        return "    /**
     * {$endpoint['description']}
     */
    public function adminOnly(Request \$request): JsonResponse
    {
        \$user    = \$request->user();
        \$granted = \$user && \$user->role === 'admin';

        {$model}::create([
            'user_id'       => \$user?->id,
            'action'        => 'GET /admin-only',
            'role_required' => 'admin',
            'granted'       => \$granted,
        ]);

        if (!\$granted) {
            return response()->json(['message' => '✗ Access denied — admin role required'], 403);
        }

        return response()->json(['message' => '✓ Access granted — you are admin']);
    }";
    }

    // ─────────────────────────────────────────────
    // ROLE USER ONLY — any authenticated user
    // ─────────────────────────────────────────────

    private static function generateRoleUserOnly(string $model, array $endpoint): string
    {
        return "    /**
     * {$endpoint['description']}
     */
    public function userOnly(Request \$request): JsonResponse
    {
        \$user = \$request->user();

        {$model}::create([
            'user_id'       => \$user?->id,
            'action'        => 'GET /user-only',
            'role_required' => 'user',
            'granted'       => true,
        ]);

        return response()->json(['message' => '✓ Access granted — open to all authenticated users']);
    }";
    }

    // ─────────────────────────────────────────────
    // ROLE PROMOTE — updates role column via Sanctum user
    // ─────────────────────────────────────────────

    private static function generateRolePromote(array $endpoint): string
    {
        return "    /**
     * {$endpoint['description']}
     */
    public function promote(Request \$request): JsonResponse
    {
        \$user = \$request->user();
        \$user->update(['role' => 'admin']);

        return response()->json(['message' => 'Promoted to admin', 'user' => \$user->fresh()]);
    }";
    }

    // ─────────────────────────────────────────────
    // ROLE DEMOTE — updates role column via Sanctum user
    // ─────────────────────────────────────────────

    private static function generateRoleDemote(array $endpoint): string
    {
        return "    /**
     * {$endpoint['description']}
     */
    public function demote(Request \$request): JsonResponse
    {
        \$user = \$request->user();
        \$user->update(['role' => 'user']);

        return response()->json(['message' => 'Demoted to user', 'user' => \$user->fresh()]);
    }";
    }

    // ─────────────────────────────────────────────
    // COMMAND RUN — executes Artisan command and records result
    // ─────────────────────────────────────────────

    private static function generateCommandRun(string $model, array $endpoint): string
    {
        $description = $endpoint['description'] ?? 'Execute a command and record the result';
        
        return "    /**
     * {$description}
     */
    public function store(Request \$request): JsonResponse
    {
        \$validated = \$request->validate([
            'command' => 'required|string',
            'triggered_by' => 'sometimes|string'
        ]);

        \$commandName = \$validated['command'];
        \$triggeredBy = \$validated['triggered_by'] ?? 'manual';

        // Map command name to signature (extracted from tatemono)
        \$signatures = [
            'cleanup-temp' => 'scheduler-test:cleanup-temp',
            'generate-report' => 'scheduler-test:generate-report',
            'ping-health' => 'scheduler-test:ping-health',
            'sync-data' => 'scheduler-test:sync-data',
        ];

        \$signature = \$signatures[\$commandName] ?? null;
        if (!\$signature) {
            return response()->json(['message' => 'Invalid command'], 400);
        }

        \$start = microtime(true);
        
        try {
            \$exitCode = \Artisan::call(\$signature);
            \$output = \Artisan::output();
        } catch (\Exception \$e) {
            \$exitCode = 1;
            \$output = \$e->getMessage();
        }

        \$durationMs = (int) ((microtime(true) - \$start) * 1000);

        \$commandRun = {$model}::create([
            'command_name' => \$commandName,
            'signature' => \$signature,
            'exit_code' => \$exitCode,
            'output' => \$output,
            'triggered_by' => \$triggeredBy,
            'duration_ms' => \$durationMs,
        ]);

        return response()->json(\$commandRun, 201);
    }";
    }
    
    // ─────────────────────────────────────────────
    // JOB DISPATCH — queues a job and returns immediately
    // ─────────────────────────────────────────────
    
    private static function generateJobDispatch(string $model, array $endpoint): string
    {
        $description = $endpoint['description'] ?? 'Dispatch a job';
        
        return "    /**
         * {$description}
         */
        public function store(Request \$request): JsonResponse
        {
            \$validated = \$request->validate([
                'job' => 'required|string'
            ]);
    
            \$jobClass = match(\$validated['job']) {
                'process-data' => \\App\\Jobs\\Arkzen\\JobTest\\ProcessDataJob::class,
                'heavy-computation' => \\App\\Jobs\\Arkzen\\JobTest\\HeavyComputationJob::class,
                'always-fails' => \\App\\Jobs\\Arkzen\\JobTest\\AlwaysFailsJob::class,
                default => throw new \\Exception('Unknown job: ' . \$validated['job']),
            };
    
            dispatch(new \$jobClass());
    
            return response()->json(['message' => 'Job dispatched'], 202);
        }";
    }
    
    // ─────────────────────────────────────────────
    // EVENT FIRE — fires an event and returns immediately
    // ─────────────────────────────────────────────
    
    private static function generateEventFire(string $model, array $endpoint): string
    {
        $description = $endpoint['description'] ?? 'Fire an event';
        
        return "    /**
         * {$description}
         */
        public function store(Request \$request): JsonResponse
        {
            \$validated = \$request->validate([
                'event' => 'required|string',
                'payload' => 'sometimes|array'
            ]);
    
            \$eventClass = match(\$validated['event']) {
                'user-signed-up' => \\App\\Events\\Arkzen\\EventsTest\\UserSignedUp::class,
                'order-placed' => \\App\\Events\\Arkzen\\EventsTest\\OrderPlaced::class,
                'data-exported' => \\App\\Events\\Arkzen\\EventsTest\\DataExported::class,
                default => throw new \\Exception('Unknown event: ' . \$validated['event']),
            };
    
            event(new \$eventClass(\$validated['payload'] ?? []));
    
            return response()->json(['message' => 'Event fired'], 202);
        }";
    }
    
    // ─────────────────────────────────────────────
    // BROADCAST — stores message and broadcasts it
    // ─────────────────────────────────────────────
    
        // ─────────────────────────────────────────────
    // BROADCAST — stores message and broadcasts it
    // ─────────────────────────────────────────────
    
    private static function generateBroadcast(string $model, string $slugNs, array $endpoint): string
    {
        $description = $endpoint['description'] ?? 'Store and broadcast';
        $eventClass = "\\App\\Events\\Arkzen\\{$slugNs}\\Broadcast\\MessageSent";
        $validation = self::generateValidation($endpoint['validation'] ?? []);
        
        return "    /**
         * {$description}
         */
        public function store(Request \$request): JsonResponse
        {
            \$validated = \$request->validate([
    {$validation}
            ]);
    
            \$message = {$model}::create(\$validated);
            
            broadcast(new {$eventClass}(\$message->toArray()));
    
            return response()->json(\$message, 201);
        }";
    }
    
    
    
    // ─────────────────────────────────────────────
    // MAIL SEND — sends a mailable and logs the attempt
    // ─────────────────────────────────────────────
    private static function generateMailSend(string $model, array $endpoint, string $slugNs): string
    {
        $description = $endpoint['description'] ?? 'Send an email';
        $validation  = self::generateValidation($endpoint['validation'] ?? []);

        return "    /**
     * {$description}
     */
    public function store(Request \$request): JsonResponse
    {
        \$validated = \$request->validate([
{$validation}
        ]);

        // Capture authenticated user first — explicit guard avoids cache poisoning
        \$user = \$request->user('sanctum');

        // Dynamically resolve the Mailable class from the mail key
        \$mailKey = \$validated['mail'];
        \$className = \\Illuminate\\Support\\Str::studly(str_replace('-', '_', \$mailKey)) . 'Mail';
        \$fullClass = \"\\\\App\\\\Mail\\\\Arkzen\\\\{$slugNs}\\\\\" . \$className;

        if (!class_exists(\$fullClass)) {
            throw new \\InvalidArgumentException('Unknown mail type: ' . \$mailKey);
        }

        // Send the email (queued if the mailable implements ShouldQueue)
        \\Mail::to(\$validated['to'])->send(new \$fullClass( ...array_values(\$validated['data'] ?? []) ));

        // Log the attempt using the captured user
        \$mailLog = {$model}::create([
            'user_id'   => \$user?->id,
            'to_email'  => \$validated['to'],
            'subject'   => \$fullClass::\$subject ?? \$mailKey,
            'mail_class'=> \$fullClass,
            'status'    => 'sent',
        ]);

        return response()->json(\$mailLog, 201);
    }";
    }
    
    
    // ─────────────────────────────────────────────
    // NOTIFICATION TRIGGER — dispatches a notification to the authenticated user
    // ─────────────────────────────────────────────
          private static function generateNotificationTrigger(string $model, array $endpoint, string $slugNs): string
      {
          $description = $endpoint['description'] ?? 'Trigger a notification';
          $validation  = self::generateValidation($endpoint['validation'] ?? []);
  
          return "    /**
       * {$description}
       */
      public function store(Request \$request): JsonResponse
      {
          \$validated = \$request->validate([
  {$validation}
          ]);
  
          \$user = \$request->user();
          \$notificationKey = \$validated['notification'];
  
          // Dynamically resolve the notification class
          \$className = \\Illuminate\\Support\\Str::studly(str_replace('-', '_', \$notificationKey));
          \$fullClass = \"\\\\App\\\\Notifications\\\\Arkzen\\\\{$slugNs}\\\\\" . \$className;
  
          if (!class_exists(\$fullClass)) {
              throw new \\InvalidArgumentException('Unknown notification type: ' . \$notificationKey);
          }
  
          // Dispatch the notification (Laravel handles database storage via the Notifiable trait)
          \$user->notify(new \$fullClass());
  
          return response()->json([
              'message' => 'Notification triggered successfully',
              'type'    => \$notificationKey,
          ], 201);
      }";
      }
    

    // ─────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────

    private static function generateValidation(array $rules): string
    {
        $lines = [];
        foreach ($rules as $field => $rule) {
            $lines[] = "            '{$field}' => '{$rule}'";
        }
        return implode(",\n", $lines);
    }

    private static function generateFilterLogic(array $query): string
    {
        $lines = [];
        foreach ($query as $param => $type) {
            if ($param === 'search' || $param === 'per_page') continue;
            $lines[] = "        if (\$request->filled('{$param}')) {\n            \$query->where('{$param}', \$request->{$param});\n        }";
        }
        return implode("\n", $lines);
    }

    private static function detectSearchFields(array $query): array
    {
        return isset($query['search']) ? ['name', 'description'] : [];
    }

    private static function extractDefault(string $definition): string
    {
        if (preg_match('/default:(\d+)/', $definition, $matches)) {
            return $matches[1];
        }
        return '15';
    }
}