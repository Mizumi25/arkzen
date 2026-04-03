# ARKZEN ENGINE — BACKEND SETUP
## Phase 3: Laravel Backend Engine

---

## FILES IN THIS PHASE

```
backend/
├── config/
│   └── arkzen.php                           → Arkzen config (copy to Laravel /config/)
├── routes/
│   └── arkzen.php                           → Engine internal routes
└── app/
    ├── Providers/Arkzen/
    │   └── ArkzenServiceProvider.php        → Engine heart, boots everything
    ├── Http/
    │   ├── Controllers/Arkzen/
    │   │   └── ArkzenEngineController.php   → Receives bridge calls, runs builders
    │   └── Middleware/
    │       └── ArkzenEngineMiddleware.php   → Protects engine routes
    └── Arkzen/
        ├── Readers/
        │   ├── RegistryReader.php           → Reads/writes arkzen.json
        │   └── ModuleReader.php             → Validates + parses payload
        └── Builders/
            ├── MigrationBuilder.php         → Generates + runs migrations
            ├── ModelBuilder.php             → Generates Eloquent models
            ├── ControllerBuilder.php        → Generates API controllers
            ├── RouteRegistrar.php           → Generates + registers routes
            └── SeederBuilder.php            → Generates + runs seeders
```

---

## HOW TO INTEGRATE INTO YOUR LARAVEL PROJECT

### 1. Copy files into Laravel

```bash
# Copy all Arkzen backend files into your Laravel project
cp -r backend/app/Arkzen app/Arkzen
cp -r backend/app/Http/Controllers/Arkzen app/Http/Controllers/Arkzen
cp -r backend/app/Http/Middleware/ArkzenEngineMiddleware.php app/Http/Middleware/
cp -r backend/app/Providers/Arkzen app/Providers/Arkzen
cp backend/config/arkzen.php config/arkzen.php
cp backend/routes/arkzen.php routes/arkzen.php
```

### 2. Register the Service Provider

In `bootstrap/providers.php` add:
```php
App\Providers\Arkzen\ArkzenServiceProvider::class,
```

### 3. Register the Middleware

In `bootstrap/app.php` add:
```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'arkzen.engine' => \App\Http\Middleware\ArkzenEngineMiddleware::class,
    ]);
})
```

### 4. Set up SQLite

In `.env`:
```env
DB_CONNECTION=sqlite
DB_DATABASE=/absolute/path/to/database/database.sqlite
ARKZEN_ENGINE_SECRET=your-secret-here
```

Create the SQLite file:
```bash
touch database/database.sqlite
php artisan migrate
```

### 5. Create required directories

```bash
mkdir -p routes/modules
mkdir -p database/migrations/arkzen
mkdir -p database/seeders/arkzen
```

### 6. Start Laravel

```bash
php artisan serve --port=8000
```

---

## HOW IT WORKS

```
Frontend drops tatemono
        ↓
Watcher detects it
        ↓
Parser reads all sections
        ↓
Backend Bridge sends POST to /arkzen/build
        ↓
ArkzenEngineController receives it
        ↓
Runs all builders in sequence:
  1. MigrationBuilder  → creates + runs migration
  2. ModelBuilder      → creates Eloquent model
  3. ControllerBuilder → creates API controller
  4. RouteRegistrar    → creates route file + registers
  5. SeederBuilder     → creates + runs seeder (if declared)
        ↓
Returns build result to frontend bridge
        ↓
Frontend logs all steps
```

---

## GENERATED FILE LOCATIONS

Every tatemono drop generates files in:

```
app/Models/Arkzen/            → YourModel.php
app/Http/Controllers/Arkzen/  → YourController.php
database/migrations/arkzen/   → timestamp_create_table.php
database/seeders/arkzen/      → YourModelArkzenSeeder.php
routes/modules/               → tatemono-name.php
```

---

## ENVIRONMENT VARIABLES

```env
DB_CONNECTION=sqlite
DB_DATABASE=/path/to/database.sqlite
ARKZEN_ENGINE_SECRET=match-this-with-frontend
```

---

## MULTIPLE PROJECTS

Each project is a separate Laravel instance on a different port:

```
Project 1: php artisan serve --port=8000
Project 2: php artisan serve --port=8001
Project 3: php artisan serve --port=8002
```

Frontend `.env.local` points to its own backend:
```env
ARKZEN_BACKEND_URL=http://localhost:8000
```
