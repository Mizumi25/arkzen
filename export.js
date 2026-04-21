#!/usr/bin/env node

// ============================================================
// ARKZEN ENGINE — EXPORT SCRIPT v7
//
// Architecture: Build-first, copy-everything
//
//   1. Trigger the engine builder for the tatemono (same as
//      the watcher does on file change) so all output is fresh
//   2. Copy generated frontend files from engine/frontend/app/{name}/
//   3. Copy ALL generated backend PHP files scoped to this tatemono —
//      handles Controllers, Requests, Middleware in SCOPED subdirs
//      (Arkzen/{TatPascal}/) instead of the old flat layout
//   4. Copy the full base infrastructure (config, vendor, etc.)
//   5. Write glue files:
//        bootstrap/app.php     — standalone, wires ArkzenSanctumTokenResolver
//        ArkzenSanctumTokenResolver.php — standalone (no RegistryReader dep)
//        middleware.ts          — standalone, no engine import
//        auth-tatemonos.ts      — single tatemono scope
//        start.js               — spawns backend + frontend (+ queue/reverb)
//   6. Rewrite ALL namespaces (incl. scoped Arkzen\{TatPascal} layer)
//   7. Run migrations + seed
//
// FIXES vs v6:
//   - Controllers now read from Arkzen/{TatPascal}/ (not flat)
//   - Requests now read from Arkzen/{TatPascal}/ (not flat)
//   - Middleware/Arkzen/{TatPascal}/ is now fully copied
//   - ArkzenSanctumTokenResolver is now copied (standalone, no RegistryReader)
//   - app/Http/Controllers/Controller.php (base) now copied
//   - bootstrap/app.php now properly wires ArkzenSanctumTokenResolver prepend
//   - Namespace rewriter handles scoped \Arkzen\{TatPascal}\ layer for
//     Controllers, Requests, and Middleware
//   - use-statement rewriter handles two-level scoped namespaces
//   - Storage symlink created automatically
//   - node_modules copied with symlink fallback for speed
//
// Usage:  node export.js <tatemono-name>
// Output: projects/<tatemono-name>/
// ============================================================

const { execSync, spawnSync } = require('child_process')
const fs   = require('fs')
const path = require('path')

const ROOT_DIR      = __dirname
const ENGINE_DIR    = path.join(ROOT_DIR, 'engine')
const FRONTEND_DIR  = path.join(ENGINE_DIR, 'frontend')
const BACKEND_DIR   = path.join(ENGINE_DIR, 'backend')
const TATEMONOS_DIR = path.join(ROOT_DIR, 'tatemonos')
const PROJECTS_DIR  = path.join(ROOT_DIR, 'projects')

// ─────────────────────────────────────────────
// LOGGING
// ─────────────────────────────────────────────

function log(msg)     { console.log(`\n  ✦ ${msg}`) }
function success(msg) { console.log(`  ✓ ${msg}`) }
function warn(msg)    { console.log(`  ⚠ ${msg}`) }
function skip(msg)    { console.log(`  – ${msg} (not found, skipped)`) }
function divider()    { console.log('\n' + '─'.repeat(50)) }

// ─────────────────────────────────────────────
// VALIDATE INPUT
// ─────────────────────────────────────────────

const tatName = process.argv[2]
if (!tatName) {
  console.log('\n  Usage: node export.js <tatemono-name>')
  console.log('  Example: node export.js inventory-management\n')
  console.log('  Available tatemonos:')
  if (fs.existsSync(TATEMONOS_DIR)) {
    fs.readdirSync(TATEMONOS_DIR).forEach(f => {
      if (fs.existsSync(path.join(TATEMONOS_DIR, f, 'core.tsx')))
        console.log(`    - ${f}`)
    })
  }
  console.log('')
  process.exit(1)
}

const tatPath = path.join(TATEMONOS_DIR, tatName, 'core.tsx')
if (!fs.existsSync(tatPath)) {
  console.log(`\n  ✗ Tatemono not found: tatemonos/${tatName}/core.tsx\n`)
  process.exit(1)
}

const PROJECT_DIR = path.join(PROJECTS_DIR, tatName)
const PROJ_FRONT  = path.join(PROJECT_DIR, 'frontend')
const PROJ_BACK   = path.join(PROJECT_DIR, 'backend')

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function readMeta(content) {
  const match = content.match(/\/\* @arkzen:meta([\s\S]*?)\*\//)
  if (!match) return {}
  const result = {}
  match[1].split('\n').forEach(line => {
    const idx = line.indexOf(':')
    if (idx > -1) result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  })
  return result
}


// ─────────────────────────────────────────────
// AUTH MIGRATION GENERATOR
// For pure-auth tatemonos, generate standard Laravel migration files
// so the exported project can migrate from scratch cleanly.
// ─────────────────────────────────────────────

function generateAuthMigrations(projBack, tatName, content) {
  const migrationsDir = path.join(projBack, 'database', 'migrations')
  fs.mkdirSync(migrationsDir, { recursive: true })

  // Parse auth_seed users if present (e.g. roles-test seeds admin/user)
  const authSeedMatch = content.match(/auth_seed:\s*\n([\s\S]*?)(?=\n\/\*|\n\n\/\*|$)/)
  let seedUsers = []
  if (authSeedMatch) {
    const seedBlock = authSeedMatch[1]
    const userBlocks = [...seedBlock.matchAll(/- name:\s*(.+)\n\s+email:\s*(.+)\n\s+password:\s*(.+)(?:\n\s+role:\s*(.+))?/g)]
    seedUsers = userBlocks.map(m => ({
      name:     m[1].trim(),
      email:    m[2].trim(),
      password: m[3].trim(),
      role:     m[4]?.trim() ?? 'user',
    }))
  }

  // users table migration
  fs.writeFileSync(
    path.join(migrationsDir, '0001_01_01_000000_create_users_table.php'),
    `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->string('role', 20)->default('user');
            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
`
  )
  success('database/migrations/0001_01_01_000000_create_users_table.php (auth)')

  // personal_access_tokens migration
  fs.writeFileSync(
    path.join(migrationsDir, '0001_01_01_000001_create_personal_access_tokens_table.php'),
    `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personal_access_tokens');
    }
};
`
  )
  success('database/migrations/0001_01_01_000001_create_personal_access_tokens_table.php (auth)')

  return seedUsers
}



function toPascal(str) {
  return str.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')
}

// ─────────────────────────────────────────────
// READ TATEMONO
// ─────────────────────────────────────────────

const content   = fs.readFileSync(tatPath, 'utf-8')
const meta      = readMeta(content)
const tatPascal = toPascal(tatName)
const tatSnake  = tatName.replace(/-/g, '_')
const hasAuth   = meta.auth === 'true'

const hasBackend = [
  '@arkzen:database', '@arkzen:api', '@arkzen:routes',
  '@arkzen:jobs', '@arkzen:events', '@arkzen:realtime',
  '@arkzen:notifications', '@arkzen:mail', '@arkzen:console',
].some(m => content.includes(m)) || hasAuth

const hasRealtime = content.includes('@arkzen:realtime') || content.includes('@arkzen:notifications')
const hasJobs     = content.includes('@arkzen:jobs')     || content.includes('@arkzen:console')
const hasMail     = content.includes('@arkzen:mail')

divider()
console.log(`\n  ARKZEN — Exporting tatemono: ${tatName}\n`)
divider()
console.log(`  Format:   v7`)
console.log(`  Tatemono: ${tatName}  (${tatPascal})`)
console.log(`  Auth:     ${hasAuth}`)
console.log(`  Backend:  ${hasBackend}`)
console.log(`  Realtime: ${hasRealtime}`)
console.log(`  Jobs:     ${hasJobs}`)
console.log(`  Mail:     ${hasMail}`)

// ─────────────────────────────────────────────
// SETUP OUTPUT DIRECTORY
// ─────────────────────────────────────────────

if (fs.existsSync(PROJECT_DIR)) {
  log('Overwriting existing export...')
  fs.rmSync(PROJECT_DIR, { recursive: true, force: true })
}
fs.mkdirSync(PROJECT_DIR, { recursive: true })

// ─────────────────────────────────────────────
// STEP 1 — ENGINE BUILD
// ─────────────────────────────────────────────

log(`Triggering engine build for ${tatName}...`)

const buildScript = `
import { buildTatemono } from './arkzen/core/builder'
buildTatemono(${JSON.stringify(tatPath)})
  .then(result => {
    if (result.success) { console.log('[export-build] OK'); process.exit(0) }
    else { console.error('[export-build] FAIL:', result.errors.join(', ')); process.exit(1) }
  })
  .catch(err => { console.error('[export-build] FATAL:', err.message); process.exit(1) })
`

const tmpScript = path.join(FRONTEND_DIR, '__export_build_tmp.ts')
fs.writeFileSync(tmpScript, buildScript)

const tsxBin = path.join(FRONTEND_DIR, 'node_modules', '.bin', 'tsx')
const buildResult = spawnSync(tsxBin, [tmpScript], {
  cwd:     FRONTEND_DIR,
  stdio:   'pipe',
  env:     { ...process.env, ARKZEN_BACKEND_URL: 'http://localhost:8000', ARKZEN_ENGINE_SECRET: 'arkzen-engine-secret' },
  timeout: 60000,
})

if (fs.existsSync(tmpScript)) fs.unlinkSync(tmpScript)

const buildOut = (buildResult.stdout || '').toString()
const buildErr = (buildResult.stderr || '').toString()

if (buildResult.status === 0 && buildOut.includes('[export-build] OK')) {
  success('Engine build complete')
} else {
  warn('Engine build had issues — proceeding with existing output')
  if (buildErr) warn(buildErr.split('\n').filter(l => l.trim()).slice(0, 6).join(' | '))
}

// ─────────────────────────────────────────────
// NAMESPACE REWRITER  (v7 — handles scoped layer)
//
// Engine PHP files live under:
//   App\...\Arkzen\{TatPascal}\{Class}   ← scoped (new)
//   App\...\Arkzen\{Class}               ← flat (legacy)
//
// Both forms are rewritten to clean App\...\{Class}
// ─────────────────────────────────────────────

    function rewriteNamespaces(src) {
  return src
    // ── Namespace declarations — scoped (Arkzen\{TatPascal}) ────────
    .replace(new RegExp(`namespace App\\\\Models\\\\Arkzen\\\\${tatPascal};`,                        'g'), 'namespace App\\Models;')
    .replace(new RegExp(`namespace App\\\\Http\\\\Controllers\\\\Arkzen\\\\${tatPascal};`,           'g'), 'namespace App\\Http\\Controllers;')
    .replace(new RegExp(`namespace App\\\\Http\\\\Requests\\\\Arkzen\\\\${tatPascal};`,              'g'), 'namespace App\\Http\\Requests;')
    .replace(new RegExp(`namespace App\\\\Http\\\\Resources\\\\Arkzen\\\\${tatPascal};`,             'g'), 'namespace App\\Http\\Resources;')
    .replace(new RegExp(`namespace App\\\\Http\\\\Middleware\\\\Arkzen\\\\${tatPascal};`,            'g'), 'namespace App\\Http\\Middleware;')
    .replace(new RegExp(`namespace App\\\\Policies\\\\Arkzen\\\\${tatPascal};`,                      'g'), 'namespace App\\Policies;')
    .replace(new RegExp(`namespace App\\\\Jobs\\\\Arkzen\\\\${tatPascal};`,                          'g'), 'namespace App\\Jobs;')
    .replace(new RegExp(`namespace App\\\\Events\\\\Arkzen\\\\${tatPascal};`,                        'g'), 'namespace App\\Events;')
    .replace(new RegExp(`namespace App\\\\Listeners\\\\Arkzen\\\\${tatPascal};`,                     'g'), 'namespace App\\Listeners;')
    .replace(new RegExp(`namespace App\\\\Mail\\\\Arkzen\\\\${tatPascal};`,                          'g'), 'namespace App\\Mail;')
    .replace(new RegExp(`namespace App\\\\Notifications\\\\Arkzen\\\\${tatPascal};`,                 'g'), 'namespace App\\Notifications;')
    .replace(new RegExp(`namespace App\\\\Console\\\\Commands\\\\Arkzen\\\\${tatPascal};`,           'g'), 'namespace App\\Console\\Commands;')
    .replace(new RegExp(`namespace Database\\\\Factories\\\\Arkzen\\\\${tatPascal};`,                'g'), 'namespace Database\\Factories;')

    // ── Namespace declarations — flat (Arkzen only, legacy) ─────────
    .replace(/namespace App\\Models\\Arkzen;/g,                    'namespace App\\Models;')
    .replace(/namespace App\\Http\\Controllers\\Arkzen;/g,         'namespace App\\Http\\Controllers;')
    .replace(/namespace App\\Http\\Requests\\Arkzen;/g,            'namespace App\\Http\\Requests;')
    .replace(/namespace App\\Http\\Resources\\Arkzen;/g,           'namespace App\\Http\\Resources;')
    .replace(/namespace App\\Http\\Middleware\\Arkzen;/g,          'namespace App\\Http\\Middleware;')
    .replace(/namespace App\\Policies\\Arkzen;/g,                  'namespace App\\Policies;')
    .replace(/namespace App\\Jobs\\Arkzen;/g,                      'namespace App\\Jobs;')
    .replace(/namespace App\\Events\\Arkzen;/g,                    'namespace App\\Events;')
    .replace(/namespace App\\Listeners\\Arkzen;/g,                 'namespace App\\Listeners;')
    .replace(/namespace App\\Mail\\Arkzen;/g,                      'namespace App\\Mail;')
    .replace(/namespace App\\Notifications\\Arkzen;/g,             'namespace App\\Notifications;')
    .replace(/namespace App\\Console\\Commands\\Arkzen;/g,         'namespace App\\Console\\Commands;')
    .replace(/namespace Database\\Seeders\\Arkzen;/g,              'namespace Database\\Seeders;')
    .replace(/namespace Database\\Factories\\Arkzen;/g,            'namespace Database\\Factories;')

    // ── use statements — scoped two-level (Arkzen\{TatPascal}\Class) ─
    .replace(new RegExp(`use App\\\\Models\\\\Arkzen\\\\${tatPascal}\\\\([A-Za-z0-9_]+)(\\s+as\\s+[A-Za-z0-9_]+)?;`,                  'g'), 'use App\\Models\\$1$2;')
    .replace(new RegExp(`use App\\\\Http\\\\Controllers\\\\Arkzen\\\\${tatPascal}\\\\([A-Za-z0-9_]+)(\\s+as\\s+[A-Za-z0-9_]+)?;`,     'g'), 'use App\\Http\\Controllers\\$1$2;')
    .replace(new RegExp(`use App\\\\Http\\\\Requests\\\\Arkzen\\\\${tatPascal}\\\\([A-Za-z0-9_]+)(\\s+as\\s+[A-Za-z0-9_]+)?;`,        'g'), 'use App\\Http\\Requests\\$1$2;')
    .replace(new RegExp(`use App\\\\Http\\\\Resources\\\\Arkzen\\\\${tatPascal}\\\\([A-Za-z0-9_]+)(\\s+as\\s+[A-Za-z0-9_]+)?;`,       'g'), 'use App\\Http\\Resources\\$1$2;')
    .replace(new RegExp(`use App\\\\Http\\\\Middleware\\\\Arkzen\\\\${tatPascal}\\\\([A-Za-z0-9_]+)(\\s+as\\s+[A-Za-z0-9_]+)?;`,      'g'), 'use App\\Http\\Middleware\\$1$2;')
    .replace(new RegExp(`use App\\\\Policies\\\\Arkzen\\\\${tatPascal}\\\\([A-Za-z0-9_]+)(\\s+as\\s+[A-Za-z0-9_]+)?;`,                'g'), 'use App\\Policies\\$1$2;')
    .replace(new RegExp(`use App\\\\Jobs\\\\Arkzen\\\\${tatPascal}\\\\([A-Za-z0-9_]+)(\\s+as\\s+[A-Za-z0-9_]+)?;`,                    'g'), 'use App\\Jobs\\$1$2;')
    .replace(new RegExp(`use App\\\\Events\\\\Arkzen\\\\${tatPascal}\\\\([A-Za-z0-9_]+)(\\s+as\\s+[A-Za-z0-9_]+)?;`,                  'g'), 'use App\\Events\\$1$2;')
    .replace(new RegExp(`use App\\\\Listeners\\\\Arkzen\\\\${tatPascal}\\\\([A-Za-z0-9_]+)(\\s+as\\s+[A-Za-z0-9_]+)?;`,               'g'), 'use App\\Listeners\\$1$2;')
    .replace(new RegExp(`use App\\\\Mail\\\\Arkzen\\\\${tatPascal}\\\\([A-Za-z0-9_]+)(\\s+as\\s+[A-Za-z0-9_]+)?;`,                    'g'), 'use App\\Mail\\$1$2;')
    .replace(new RegExp(`use App\\\\Notifications\\\\Arkzen\\\\${tatPascal}\\\\([A-Za-z0-9_]+)(\\s+as\\s+[A-Za-z0-9_]+)?;`,           'g'), 'use App\\Notifications\\$1$2;')
    .replace(new RegExp(`use App\\\\Console\\\\Commands\\\\Arkzen\\\\${tatPascal}\\\\([A-Za-z0-9_]+)(\\s+as\\s+[A-Za-z0-9_]+)?;`,     'g'), 'use App\\Console\\Commands\\$1$2;')
    .replace(new RegExp(`use Database\\\\Factories\\\\Arkzen\\\\${tatPascal}\\\\([A-Za-z0-9_]+)(\\s+as\\s+[A-Za-z0-9_]+)?;`,          'g'), 'use Database\\Factories\\$1$2;')

    // ── use statements — flat one-level (Arkzen\Class) ───────────────
    .replace(/use App\\Models\\Arkzen\\([A-Za-z0-9_]+)(\s+as\s+[A-Za-z0-9_]+)?;/g,                    'use App\\Models\\$1$2;')
    .replace(/use App\\Http\\Controllers\\Arkzen\\([A-Za-z0-9_]+)(\s+as\s+[A-Za-z0-9_]+)?;/g,         'use App\\Http\\Controllers\\$1$2;')
    .replace(/use App\\Http\\Requests\\Arkzen\\([A-Za-z0-9_]+)(\s+as\s+[A-Za-z0-9_]+)?;/g,            'use App\\Http\\Requests\\$1$2;')
    .replace(/use App\\Http\\Resources\\Arkzen\\([A-Za-z0-9_]+)(\s+as\s+[A-Za-z0-9_]+)?;/g,           'use App\\Http\\Resources\\$1$2;')
    .replace(/use App\\Http\\Middleware\\Arkzen\\([A-Za-z0-9_]+)(\s+as\s+[A-Za-z0-9_]+)?;/g,          'use App\\Http\\Middleware\\$1$2;')
    .replace(/use App\\Policies\\Arkzen\\([A-Za-z0-9_]+)(\s+as\s+[A-Za-z0-9_]+)?;/g,                  'use App\\Policies\\$1$2;')
    .replace(/use App\\Jobs\\Arkzen\\([A-Za-z0-9_]+)(\s+as\s+[A-Za-z0-9_]+)?;/g,                      'use App\\Jobs\\$1$2;')
    .replace(/use App\\Events\\Arkzen\\([A-Za-z0-9_]+)(\s+as\s+[A-Za-z0-9_]+)?;/g,                    'use App\\Events\\$1$2;')
    .replace(/use App\\Listeners\\Arkzen\\([A-Za-z0-9_]+)(\s+as\s+[A-Za-z0-9_]+)?;/g,                 'use App\\Listeners\\$1$2;')
    .replace(/use App\\Mail\\Arkzen\\([A-Za-z0-9_]+)(\s+as\s+[A-Za-z0-9_]+)?;/g,                      'use App\\Mail\\$1$2;')
    .replace(/use App\\Notifications\\Arkzen\\([A-Za-z0-9_]+)(\s+as\s+[A-Za-z0-9_]+)?;/g,             'use App\\Notifications\\$1$2;')
    .replace(/use App\\Console\\Commands\\Arkzen\\([A-Za-z0-9_]+)(\s+as\s+[A-Za-z0-9_]+)?;/g,         'use App\\Console\\Commands\\$1$2;')
    .replace(/use Database\\Factories\\Arkzen\\([A-Za-z0-9_]+)(\s+as\s+[A-Za-z0-9_]+)?;/g,            'use Database\\Factories\\$1$2;')

    // ── Fully-qualified class refs inside strings/new/static calls ───
    .replace(new RegExp(`App\\\\\\\\Models\\\\\\\\Arkzen\\\\\\\\${tatPascal}\\\\\\\\([A-Za-z0-9_]+)`,       'g'), 'App\\\\Models\\\\$1')
    .replace(new RegExp(`App\\\\\\\\Http\\\\\\\\Middleware\\\\\\\\Arkzen\\\\\\\\${tatPascal}\\\\\\\\([A-Za-z0-9_]+)`, 'g'), 'App\\\\Http\\\\Middleware\\\\$1')
    .replace(/App\\\\Models\\\\Arkzen\\\\([A-Za-z0-9_]+)/g,                   'App\\\\Models\\\\$1')
    .replace(/App\\\\Http\\\\Middleware\\\\Arkzen\\\\([A-Za-z0-9_]+)/g,       'App\\\\Http\\\\Middleware\\\\$1')

    // ── Route prefix fix — strip /api/ from ->prefix() calls ─────────
    .replace(/->prefix\('\/api\//g, "->prefix('/" )

    // ── Database connection stripping ────────────────────────────────
    .replace(new RegExp(`DB::connection\\('${tatSnake}'\\)->`, 'g'),  'DB::')
    .replace(new RegExp(`->on\\('${tatSnake}'\\)`,             'g'),  '')
    .replace(/protected \$connection = '[^']+';/,                      '')
    .replace(/Schema::connection\('[^']+'\)->create\(/g,               'Schema::create(')
    .replace(/Schema::connection\('[^']+'\)->table\(/g,                'Schema::table(')
    .replace(/Schema::connection\('[^']+'\)->dropIfExists\(/g,         'Schema::dropIfExists(')

    // ── Table prefix stripping ───────────────────────────────────────
    .replace(new RegExp(`'${tatSnake}_([a-z_]+)'`, 'g'),              "'$1'")

    // ── Fix unique/exists validation rules that use connection.table syntax ─────
    // Engine generates: unique:auth_test.auth_test_users,email
    // Export needs:      unique:users,email
    .replace(new RegExp(`unique:${tatSnake}\\.${tatSnake}_([a-z_]+),`, 'g'), 'unique:$1,')
    .replace(new RegExp(`exists:${tatSnake}\\.${tatSnake}_([a-z_]+),`, 'g'), 'exists:$1,')

    // ── Middleware alias FQCN rewrite in route files ─────────────────
    .replace(new RegExp(`\\\\App\\\\Http\\\\Middleware\\\\Arkzen\\\\${tatPascal}\\\\([A-Za-z0-9_]+)`,       'g'), '\\App\\Http\\Middleware\\$1')
    .replace(/\\App\\Http\\Middleware\\Arkzen\\([A-Za-z0-9_]+)/g,             '\\App\\Http\\Middleware\\$1')
}

// ─────────────────────────────────────────────
// COPY HELPERS
// ─────────────────────────────────────────────

function copyPhp(srcFile, destFile) {
  fs.mkdirSync(path.dirname(destFile), { recursive: true })
  fs.writeFileSync(destFile, rewriteNamespaces(fs.readFileSync(srcFile, 'utf-8')))
}

// Copy an entire scoped directory of PHP files, all flat into destDir
function copyPhpDir(srcDir, destDir, label) {
  if (!fs.existsSync(srcDir)) {
    skip(label || path.relative(BACKEND_DIR, srcDir))
    return
  }
  fs.mkdirSync(destDir, { recursive: true })
  let count = 0
  function walk(dir) {
    fs.readdirSync(dir).forEach(entry => {
      const full = path.join(dir, entry)
      if (fs.statSync(full).isDirectory()) { walk(full); return }
      if (!entry.endsWith('.php')) return
      const dest = path.join(destDir, entry)
      copyPhp(full, dest)
      success(path.relative(PROJECT_DIR, dest))
      count++
    })
  }
  walk(srcDir)
  if (count === 0) skip((label || path.relative(BACKEND_DIR, srcDir)) + ' (empty)')
}

// ─────────────────────────────────────────────
// STEP 2 — COPY FRONTEND BASE
// ─────────────────────────────────────────────

log('Copying frontend base...')

const SKIP_ENGINE_FILES = new Set([
  'arkzen/core/builder.ts', 'arkzen/core/watcher.ts',
  'arkzen/core/parser.ts',  'arkzen/core/registry.ts',
  'arkzen/core/router.ts',  'arkzen/core/validator.ts',
  'arkzen/core/backend-bridge.ts',
  'arkzen.ts', 'arkzen.json', 'arkzen.config.ts', 'validate.js',
])

fs.cpSync(FRONTEND_DIR, PROJ_FRONT, {
  recursive: true,
  filter: (src) => {
    const rel = path.relative(FRONTEND_DIR, src).replace(/\\/g, '/')
    if (rel.includes('node_modules'))       return false
    if (rel.includes('.next'))              return false
    if (rel.startsWith('tatemono'))         return false
    if (SKIP_ENGINE_FILES.has(rel))         return false
    if (rel.startsWith('app/'))             return false
    if (rel.startsWith('arkzen/generated')) return false
    return true
  }
})
success('Frontend base files (excluding node_modules)')

log('Copying node_modules...')
fs.cpSync(
  path.join(FRONTEND_DIR, 'node_modules'),
  path.join(PROJ_FRONT, 'node_modules'),
  { recursive: true }
)
success('Frontend node_modules')

// ─────────────────────────────────────────────
// STEP 3 — COPY GENERATED FRONTEND PAGES
// ─────────────────────────────────────────────

log('Copying generated frontend pages...')

// Root layout
const rootLayout = path.join(FRONTEND_DIR, 'app', 'layout.tsx')
if (fs.existsSync(rootLayout)) {
  fs.mkdirSync(path.join(PROJ_FRONT, 'app'), { recursive: true })
  fs.copyFileSync(rootLayout, path.join(PROJ_FRONT, 'app', 'layout.tsx'))
  success('app/layout.tsx')
} else {
  skip('app/layout.tsx')
}

// Tatemono pages
const engTatDir = path.join(FRONTEND_DIR, 'app', tatName)
const outTatDir = path.join(PROJ_FRONT, 'app', tatName)

if (fs.existsSync(engTatDir)) {
  fs.cpSync(engTatDir, outTatDir, { recursive: true })
  function listCopied(dir) {
    fs.readdirSync(dir).forEach(f => {
      const full = path.join(dir, f)
      if (fs.statSync(full).isDirectory()) listCopied(full)
      else success(path.relative(path.join(PROJ_FRONT, 'app'), full))
    })
  }
  listCopied(outTatDir)
} else {
  warn(`engine/frontend/app/${tatName}/ not found — engine build may have failed`)
  fs.mkdirSync(outTatDir, { recursive: true })
  fs.writeFileSync(path.join(outTatDir, 'page.tsx'),
    `'use client'\nexport default function Page() {\n  return <div className="p-8 text-neutral-500">${tatName} — build pending</div>\n}\n`
  )
}

// Animations
const engAnim = path.join(FRONTEND_DIR, 'arkzen', 'generated', `${tatName}.animations.ts`)
if (fs.existsSync(engAnim)) {
  const animDestDir = path.join(PROJ_FRONT, 'arkzen', 'generated')
  fs.mkdirSync(animDestDir, { recursive: true })
  fs.copyFileSync(engAnim, path.join(animDestDir, `${tatName}.animations.ts`))
  success(`arkzen/generated/${tatName}.animations.ts`)
}

// Custom layouts
const engCustomLayouts = path.join(FRONTEND_DIR, 'arkzen', 'core', 'layouts', 'custom')
if (fs.existsSync(engCustomLayouts)) {
  fs.cpSync(
    engCustomLayouts,
    path.join(PROJ_FRONT, 'arkzen', 'core', 'layouts', 'custom'),
    { recursive: true }
  )
  success('arkzen/core/layouts/custom/')
}

// ─────────────────────────────────────────────
// STEP 4 — FRONTEND GLUE FILES
// ─────────────────────────────────────────────

log('Writing frontend glue files...')

// app/page.tsx — root redirect
let rootRedirectTarget = `/${tatName}`
const engRootPage = path.join(engTatDir, 'page.tsx')
if (fs.existsSync(engRootPage)) {
  const redirectMatch = fs.readFileSync(engRootPage, 'utf-8').match(/redirect\(['"]([^'"]+)['"]\)/)
  if (redirectMatch) rootRedirectTarget = redirectMatch[1]
}
fs.writeFileSync(path.join(PROJ_FRONT, 'app', 'page.tsx'), [
  `'use client'`,
  `import { redirect } from 'next/navigation'`,
  `export default function ArkzenRoot() { redirect('${rootRedirectTarget}') }`,
].join('\n'))
success('app/page.tsx (root redirect → ' + rootRedirectTarget + ')')

// arkzen/generated/auth-tatemonos.ts
const genDir = path.join(PROJ_FRONT, 'arkzen', 'generated')
fs.mkdirSync(genDir, { recursive: true })
fs.writeFileSync(path.join(genDir, 'auth-tatemonos.ts'), [
  `// Auto-generated by export.js for: ${tatName}`,
  `export const AUTH_TATEMONOS: string[] = ${hasAuth ? JSON.stringify([tatName]) : '[]'}`,
].join('\n') + '\n')
success('arkzen/generated/auth-tatemonos.ts')

// middleware.ts
const guestPages = []
const authPages  = []
if (fs.existsSync(outTatDir)) {
  fs.readdirSync(outTatDir).forEach(entry => {
    const pageTsx = path.join(outTatDir, entry, 'page.tsx')
    if (!fs.existsSync(pageTsx)) return
    const pc = fs.readFileSync(pageTsx, 'utf-8')
    if      (pc.includes('GuestLayout')) guestPages.push(entry)
    else if (pc.includes('AuthLayout'))  authPages.push(entry)
  })
}
const finalGuestPages = guestPages.length ? guestPages : ['login', 'register', 'forgot-password', 'reset-password']
const finalAuthPages  = authPages.length  ? authPages  : ['dashboard', 'settings', 'profile']

fs.writeFileSync(path.join(PROJ_FRONT, 'middleware.ts'), `// Auto-generated by export.js v7 — standalone middleware for: ${tatName}
import { NextRequest, NextResponse } from 'next/server'
import { AUTH_TATEMONOS } from '@/arkzen/generated/auth-tatemonos'

const GUEST_PAGES = ${JSON.stringify(finalGuestPages)}
const AUTH_PAGES  = ${JSON.stringify(finalAuthPages)}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const segments     = pathname.split('/').filter(Boolean)
  const tatemono     = segments[0]
  const page         = segments[1]

  if (!tatemono || !page)                    return NextResponse.next()
  if (!AUTH_TATEMONOS.includes(tatemono))    return NextResponse.next()

  const token = request.cookies.get(\`arkzen-auth-\${tatemono}\`)?.value

  if (GUEST_PAGES.includes(page) && token)
    return NextResponse.redirect(new URL(\`/\${tatemono}/dashboard\`, request.url))

  if (AUTH_PAGES.includes(page) && !token)
    return NextResponse.redirect(new URL(\`/\${tatemono}/login\`, request.url))

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|api|arkzen|static|favicon.ico).*)'],
}
`)
success('middleware.ts')

// next.config.js
fs.writeFileSync(path.join(PROJ_FRONT, 'next.config.js'), hasBackend
  ? `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { forceSwcTransforms: false },
  async rewrites() {
    return [{ source: '/api/:path*', destination: 'http://127.0.0.1:8001/api/:path*' }]
  },
}
module.exports = nextConfig\n`
  : `/** @type {import('next').NextConfig} */
const nextConfig = { experimental: { forceSwcTransforms: false } }
module.exports = nextConfig\n`
)
success('next.config.js')

// package.json
const pkgPath = path.join(PROJ_FRONT, 'package.json')
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  pkg.name    = tatName
  pkg.scripts = {
    dev:   'NEXT_IGNORE_INCORRECT_LOCKFILE=1 NEXT_DISABLE_SWC=1 next dev --webpack --port 3001',
    build: 'next build',
    start: 'next start --port 3001',
  }
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
  success('package.json')
}

// ─────────────────────────────────────────────
// STEP 5 — BACKEND
// ─────────────────────────────────────────────

if (!hasBackend) {
  log('Static tatemono — no backend needed')
  success('Frontend-only export complete')
} else {

  // ── 5a. Copy backend base (excludes all engine-generated Arkzen dirs) ──

  log('Copying backend base...')

  fs.cpSync(BACKEND_DIR, PROJ_BACK, {
    recursive: true,
    filter: (src) => {
      if (src.includes('/vendor/'))                                   return false
      if (src.endsWith('.sqlite'))                                    return false
      // Skip all engine-generated Arkzen dirs — copied selectively below
      if (src.includes('/app/Arkzen/'))                              return false
      if (src.includes('/app/Http/Controllers/Arkzen/'))             return false
      if (src.includes('/app/Http/Requests/Arkzen/'))                return false
      if (src.includes('/app/Http/Resources/Arkzen/'))               return false
      if (src.includes('/app/Http/Middleware/Arkzen/'))              return false
      if (src.includes('/app/Http/Middleware/ArkzenEngine'))         return false
      if (src.includes('/app/Policies/Arkzen/'))                     return false
      if (src.includes('/app/Jobs/Arkzen/'))                         return false
      if (src.includes('/app/Events/Arkzen/'))                       return false
      if (src.includes('/app/Listeners/Arkzen/'))                    return false
      if (src.includes('/app/Mail/Arkzen/'))                         return false
      if (src.includes('/app/Notifications/Arkzen/'))                return false
      if (src.includes('/app/Console/Commands/Arkzen/'))             return false
      if (src.includes('/app/Models/Arkzen/'))                       return false
      if (src.includes('/app/Providers/Arkzen/'))                    return false
      if (src.includes('/database/arkzen/'))                         return false
      if (src.includes('/database/migrations/arkzen/'))              return false
      if (src.includes('/database/seeders/arkzen/'))                 return false
      if (src.includes('/database/factories/Arkzen/'))               return false
      if (src.includes('/routes/arkzen.php'))                        return false
      if (src.includes('/routes/modules/'))                          return false
      // Skip engine debug files
      const base = path.basename(src)
      if (['consoles_debug.json', 'roles-routes.txt', 'mail-routes.txt'].includes(base)) return false
      return true
    }
  })
  success('Backend base files')

  // Vendor
  log('Copying vendor...')
  fs.cpSync(
    path.join(BACKEND_DIR, 'vendor'),
    path.join(PROJ_BACK, 'vendor'),
    { recursive: true }
  )
  success('vendor/')

  // ── 5b. Generated PHP — all scoped to {TatPascal} subdir ───────────

  log('Copying generated backend files...')

  // Models
  copyPhpDir(
    path.join(BACKEND_DIR, 'app', 'Models', 'Arkzen', tatPascal),
    path.join(PROJ_BACK, 'app', 'Models'),
    `app/Models/Arkzen/${tatPascal}/`
  )

  // Controllers — NOW scoped under Arkzen/{TatPascal}/ (fixed from v6)
  copyPhpDir(
    path.join(BACKEND_DIR, 'app', 'Http', 'Controllers', 'Arkzen', tatPascal),
    path.join(PROJ_BACK, 'app', 'Http', 'Controllers'),
    `app/Http/Controllers/Arkzen/${tatPascal}/`
  )

  // Requests — NOW scoped under Arkzen/{TatPascal}/ (fixed from v6)
  copyPhpDir(
    path.join(BACKEND_DIR, 'app', 'Http', 'Requests', 'Arkzen', tatPascal),
    path.join(PROJ_BACK, 'app', 'Http', 'Requests'),
    `app/Http/Requests/Arkzen/${tatPascal}/`
  )

  // Resources
  copyPhpDir(
    path.join(BACKEND_DIR, 'app', 'Http', 'Resources', 'Arkzen', tatPascal),
    path.join(PROJ_BACK, 'app', 'Http', 'Resources'),
    `app/Http/Resources/Arkzen/${tatPascal}/`
  )

  // Middleware — custom per-tatemono (fixed from v6 — was never copied)
  copyPhpDir(
    path.join(BACKEND_DIR, 'app', 'Http', 'Middleware', 'Arkzen', tatPascal),
    path.join(PROJ_BACK, 'app', 'Http', 'Middleware'),
    `app/Http/Middleware/Arkzen/${tatPascal}/`
  )

  // Policies
  copyPhpDir(
    path.join(BACKEND_DIR, 'app', 'Policies', 'Arkzen', tatPascal),
    path.join(PROJ_BACK, 'app', 'Policies'),
    `app/Policies/Arkzen/${tatPascal}/`
  )

  // Jobs
  copyPhpDir(
    path.join(BACKEND_DIR, 'app', 'Jobs', 'Arkzen', tatPascal),
    path.join(PROJ_BACK, 'app', 'Jobs'),
    `app/Jobs/Arkzen/${tatPascal}/`
  )

  // Events
  copyPhpDir(
    path.join(BACKEND_DIR, 'app', 'Events', 'Arkzen', tatPascal),
    path.join(PROJ_BACK, 'app', 'Events'),
    `app/Events/Arkzen/${tatPascal}/`
  )

  // Listeners
  copyPhpDir(
    path.join(BACKEND_DIR, 'app', 'Listeners', 'Arkzen', tatPascal),
    path.join(PROJ_BACK, 'app', 'Listeners'),
    `app/Listeners/Arkzen/${tatPascal}/`
  )

  // Mail
  copyPhpDir(
    path.join(BACKEND_DIR, 'app', 'Mail', 'Arkzen', tatPascal),
    path.join(PROJ_BACK, 'app', 'Mail'),
    `app/Mail/Arkzen/${tatPascal}/`
  )

  // Notifications
  copyPhpDir(
    path.join(BACKEND_DIR, 'app', 'Notifications', 'Arkzen', tatPascal),
    path.join(PROJ_BACK, 'app', 'Notifications'),
    `app/Notifications/Arkzen/${tatPascal}/`
  )

  // Console Commands
  copyPhpDir(
    path.join(BACKEND_DIR, 'app', 'Console', 'Commands', 'Arkzen', tatPascal),
    path.join(PROJ_BACK, 'app', 'Console', 'Commands'),
    `app/Console/Commands/Arkzen/${tatPascal}/`
  )

  // Factories
  copyPhpDir(
    path.join(BACKEND_DIR, 'database', 'factories', 'Arkzen', tatPascal),
    path.join(PROJ_BACK, 'database', 'factories'),
    `database/factories/Arkzen/${tatPascal}/`
  )

  // Migrations
  copyPhpDir(
    path.join(BACKEND_DIR, 'database', 'migrations', 'arkzen', tatName),
    path.join(PROJ_BACK, 'database', 'migrations'),
    `database/migrations/arkzen/${tatName}/`
  )

  // ── 5c. Base Controller (always needed) ────────────────────────────

  const baseCtrl = path.join(BACKEND_DIR, 'app', 'Http', 'Controllers', 'Controller.php')
  if (fs.existsSync(baseCtrl)) {
    const ctrlDst = path.join(PROJ_BACK, 'app', 'Http', 'Controllers', 'Controller.php')
    fs.mkdirSync(path.dirname(ctrlDst), { recursive: true })
    fs.copyFileSync(baseCtrl, ctrlDst)
    success('app/Http/Controllers/Controller.php')
  }

  // ── 5d. Seeders ────────────────────────────────────────────────────

  const seederSrc = path.join(BACKEND_DIR, 'database', 'seeders', 'arkzen')
  const seederDst = path.join(PROJ_BACK, 'database', 'seeders')
  const copiedSeeders = []
  fs.mkdirSync(seederDst, { recursive: true })

  if (fs.existsSync(seederSrc)) {
    fs.readdirSync(seederSrc).filter(f => f.endsWith('.php')).forEach(f => {
      const body = fs.readFileSync(path.join(seederSrc, f), 'utf-8')
      const matchesTatemono =
        body.includes(`Tatemono: ${tatName}`) ||
        body.toLowerCase().includes(tatSnake) ||
        body.toLowerCase().includes(tatName.replace(/-/g, ''))
      if (matchesTatemono) {
        copyPhp(path.join(seederSrc, f), path.join(seederDst, f))
        success(`database/seeders/${f}`)
        const m = body.match(/class\s+(\w+)\s+extends/)
        if (m) copiedSeeders.push(m[1])
      }
    })
  }

  // DatabaseSeeder
  const seederCalls = copiedSeeders.map(s => `        $this->call(${s}::class);`).join('\n')
  fs.writeFileSync(path.join(seederDst, 'DatabaseSeeder.php'), `<?php

namespace Database\\Seeders;

use Illuminate\\Database\\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
${seederCalls || '        //'}
    }
}
`)
  success('database/seeders/DatabaseSeeder.php')

  // ── 5e. Mail blade views ────────────────────────────────────────────

  const mailViewSrc = path.join(BACKEND_DIR, 'resources', 'views', 'emails', 'arkzen', tatName)
  if (fs.existsSync(mailViewSrc)) {
    const mailViewDst = path.join(PROJ_BACK, 'resources', 'views', 'emails', tatName)
    fs.cpSync(mailViewSrc, mailViewDst, { recursive: true })
    success(`resources/views/emails/${tatName}/`)
  }

  // ── 5f. Routes ──────────────────────────────────────────────────────

  log('Writing route files...')

  // Main tatemono route file
  const routeSrc  = path.join(BACKEND_DIR, 'routes', 'modules', `${tatName}.php`)
  const routeDest = path.join(PROJ_BACK, 'routes', `${tatName}.php`)
  if (fs.existsSync(routeSrc)) {
    copyPhp(routeSrc, routeDest)
    success(`routes/${tatName}.php`)
  } else if (hasAuth) {
    // Engine build didn't run — write a minimal standalone auth-only route file.
    // Uses the flat namespace (App\Http\Controllers\AuthController) that the
    // standalone AuthController above lives in.
    fs.writeFileSync(routeDest, [
      '<?php',
      '',
      '// ============================================================',
      `// STANDALONE AUTH ROUTES — ${tatName}`,
      `// Generated by export.js v8 (engine build not available).`,
      '// ============================================================',
      '',
      'use Illuminate\\Support\\Facades\\Route;',
      'use App\\Http\\Controllers\\AuthController;',
      '',
      `Route::middleware(['api'])->prefix('/${tatName}/auth')->group(function () {`,
      "    Route::post('/register', [AuthController::class, 'register']);",
      "    Route::post('/login',    [AuthController::class, 'login']);",
      '});',
      '',
      `Route::middleware(['api', 'auth:sanctum'])->prefix('/${tatName}/auth')->group(function () {`,
      "    Route::post('/logout', [AuthController::class, 'logout']);",
      "    Route::get('/me',      [AuthController::class, 'me']);",
      '});',
      '',
    ].join('\n'))
    success(`routes/${tatName}.php (standalone auth-only fallback)`)
  } else {
    warn(`routes/modules/${tatName}.php not found — run engine build first`)
  }

  // api.php — simply requires the tatemono route file
  fs.writeFileSync(path.join(PROJ_BACK, 'routes', 'api.php'),
    `<?php\n\nif (file_exists(__DIR__.'/${tatName}.php')) {\n    require __DIR__.'/${tatName}.php';\n}\n`
  )
  success('routes/api.php')

  // channels.php — extract only this tatemono's blocks
  let channelsOut = `<?php\n\nuse Illuminate\\Support\\Facades\\Broadcast;\n\n`
  const channelsSrc = path.join(BACKEND_DIR, 'routes', 'channels.php')
  if (fs.existsSync(channelsSrc)) {
    const lines = fs.readFileSync(channelsSrc, 'utf-8').split('\n')
    let inModule = false
    lines.forEach(line => {
      if (line.includes(`// Module: ${tatName}`)) inModule = true
      if (inModule) {
        channelsOut += line + '\n'
        if (line.trim() === '});') { inModule = false; channelsOut += '\n' }
      }
    })
  }
  fs.writeFileSync(path.join(PROJ_BACK, 'routes', 'channels.php'), channelsOut)
  success('routes/channels.php')

  // console.php — extract only this tatemono's schedule lines
  let consoleOut = `<?php\n\nuse Illuminate\\Support\\Facades\\Schedule;\n\n`
  const consoleSrc = path.join(BACKEND_DIR, 'routes', 'console.php')
  if (fs.existsSync(consoleSrc)) {
    fs.readFileSync(consoleSrc, 'utf-8').split('\n').forEach(line => {
      if (line.includes(`[${tatName}]`)) consoleOut += line + '\n'
    })
  }
  fs.writeFileSync(path.join(PROJ_BACK, 'routes', 'console.php'), consoleOut)
  success('routes/console.php')

 // ── 5g. SQLite database ─────────────────────────────────────────────

  const engSqlite    = path.join(BACKEND_DIR, 'database', 'arkzen', `${tatName}.sqlite`)
  const destSqlite   = path.join(PROJ_BACK, 'database', 'database.sqlite')
  

  // Pure-auth tatemonos (auth:true with no @arkzen:database:users block)
  // have their users/tokens tables created at runtime by AuthBuilder using
  // prefixed table names (e.g. auth_test_users). The exported project needs
  // standard unprefixed tables (users, personal_access_tokens) so it can
  // migrate cleanly from scratch. We always force-fresh for these.
  const isPureAuth = hasAuth && !content.includes('@arkzen:database:users')
  
  const sqlitePrebuilt = !isPureAuth && fs.existsSync(engSqlite) && fs.statSync(engSqlite).size > 0


  if (isPureAuth) {
    // Always start fresh — the engine sqlite has prefixed tables that
    // don't match the exported User model (which uses 'users' table).
   
    fs.writeFileSync(destSqlite, '')
    success('database/database.sqlite (fresh — pure-auth tatemono, will migrate with standard tables)')
    log('Generating auth migrations...')
    const authSeedUsers = generateAuthMigrations(PROJ_BACK, tatName, content)
    // Stash seed users for use in Step 5d seeder generation below
    if (authSeedUsers.length) {
      const seederDst = path.join(PROJ_BACK, 'database', 'seeders')
      fs.mkdirSync(seederDst, { recursive: true })
      const seederClassName = toPascal(tatName) + 'AuthSeeder'
      const userRows = authSeedUsers.map(u =>
        `        User::firstOrCreate(['email' => '${u.email}'], [\n            'name'     => '${u.name}',\n            'password' => Hash::make('${u.password}'),\n            'role'     => '${u.role}',\n        ]);`
      ).join('\n')
      fs.writeFileSync(
        path.join(seederDst, `${seederClassName}.php`),
        `<?php

namespace Database\\Seeders;

use Illuminate\\Database\\Seeder;
use Illuminate\\Support\\Facades\\Hash;
use App\\Models\\User;

class ${seederClassName} extends Seeder
{
    public function run(): void
    {
${userRows}
    }
}
`
      )
      success(`database/seeders/${seederClassName}.php (auth seed users)`)
      copiedSeeders.push(seederClassName)
    }
  } else if (sqlitePrebuilt) {
    fs.copyFileSync(engSqlite, destSqlite)
    success('database/database.sqlite (copied from engine isolated DB — already migrated)')
  } else {
    fs.writeFileSync(destSqlite, '')
    success('database/database.sqlite (empty — migrations will populate)')
  }

  // ── 5h. Standalone ArkzenSanctumTokenResolver ──────────────────────
  // The engine version depends on RegistryReader (not available in export).
  // This standalone version resolves the token model by URL slug alone —
  // correct for single-tatemono projects where the class is always known.

  log('Writing standalone middleware...')

  const tokenClass = `App\\Models\\PersonalAccessToken`
  fs.mkdirSync(path.join(PROJ_BACK, 'app', 'Http', 'Middleware'), { recursive: true })
  const resolverLines = [
    '<?php',
    '',
    'namespace App\\Http\\Middleware;',
    '',
    'use Closure;',
    'use Illuminate\\Http\\Request;',
    'use Symfony\\Component\\HttpFoundation\\Response;',
    'use Laravel\\Sanctum\\Sanctum;',
    '',
    '// ============================================================',
    `// STANDALONE — generated by export.js v7 for: ${tatName}`,
    '//',
    '// Runs before auth:sanctum to ensure Sanctum uses the correct',
    "// PersonalAccessToken model for this tatemono's isolated DB.",
    '// ============================================================',
    '',
    'class ArkzenSanctumTokenResolver',
    '{',
    `    private const TATEMONO_SLUG = '${tatName}';`,
    `    private const TOKEN_CLASS = '${tokenClass}';`,
    '',
    '    public function handle(Request $request, Closure $next): Response',
    '    {',
    '        $path = $request->path();',
    "        if (!str_starts_with($path, 'api/')) return $next($request);",
    "        $segments = explode('/', $path);",
    '        if (count($segments) < 2 || $segments[1] !== self::TATEMONO_SLUG) return $next($request);',
    '        if (class_exists(self::TOKEN_CLASS)) Sanctum::usePersonalAccessTokenModel(self::TOKEN_CLASS);',
    '        return $next($request);',
    '    }',
    '}',
    '',
  ]
  fs.writeFileSync(
    path.join(PROJ_BACK, 'app', 'Http', 'Middleware', 'ArkzenSanctumTokenResolver.php'),
    resolverLines.join('\n')
  )
  success('app/Http/Middleware/ArkzenSanctumTokenResolver.php (standalone)')

  // ── 5h-2. Standalone auth PHP files (AuthController, User, PersonalAccessToken) ──
  // The engine generates these inside app/…/Arkzen/{TatPascal}/ and export.js
  // copies + namespace-rewrites them.  But if the engine build (Step 1) didn't
  // run on this machine (e.g. Termux, CI, no tsx) those source dirs don't exist
  // and copyPhpDir silently skips them — leaving Composer with a class it can
  // never find.  Write them unconditionally here (same content AuthBuilder
  // produces, but already in the flat exported namespace) so the project always
  // has working auth files regardless of engine build state.

  if (hasAuth) {
    const tatSnakeForAuth  = tatName.replace(/-/g, '_')
    // For pure-auth tatemonos, exported models use standard table names.
    // For tatemonos with explicit @arkzen:database:users, keep prefixed names.
    const usersTable  = isPureAuth ? 'users'                    : `${tatSnakeForAuth}_users`
    const tokensTable = isPureAuth ? 'personal_access_tokens'   : `${tatSnakeForAuth}_personal_access_tokens`
    const modelsDir        = path.join(PROJ_BACK, 'app', 'Models')
    const controllersDir   = path.join(PROJ_BACK, 'app', 'Http', 'Controllers')
    fs.mkdirSync(modelsDir,      { recursive: true })
    fs.mkdirSync(controllersDir, { recursive: true })

    // PersonalAccessToken
    const patDest = path.join(modelsDir, 'PersonalAccessToken.php')
    if (!fs.existsSync(patDest)) {
      fs.writeFileSync(patDest, [
        '<?php',
        '',
        '// ============================================================',
        `// STANDALONE — generated by export.js v8 for: ${tatName}`,
        '// ============================================================',
        '',
        'namespace App\\Models;',
        '',
        'use Laravel\\Sanctum\\PersonalAccessToken as SanctumToken;',
        '',
        'class PersonalAccessToken extends SanctumToken',
        '{',
        `    protected $connection = 'sqlite';`,
        `    protected $table      = '${tokensTable}';`,
        '}',
        '',
      ].join('\n'))
      success('app/Models/PersonalAccessToken.php (standalone)')
    }

    // User
    const userDest = path.join(modelsDir, 'User.php')
    if (!fs.existsSync(userDest)) {
      fs.writeFileSync(userDest, [
        '<?php',
        '',
        '// ============================================================',
        `// STANDALONE — generated by export.js v8 for: ${tatName}`,
        '// ============================================================',
        '',
        'namespace App\\Models;',
        '',
        'use Illuminate\\Foundation\\Auth\\User as Authenticatable;',
        'use Laravel\\Sanctum\\HasApiTokens;',
        '',
        'class User extends Authenticatable',
        '{',
        '    use HasApiTokens;',
        '',
        `    protected $connection = 'sqlite';`,
        '',
        `    protected $table = '${usersTable}';`,
        '',
        "    protected $fillable = ['name', 'email', 'password', 'role'];",
        '',
        "    protected $hidden = ['password', 'remember_token'];",
        '',
        '    protected $casts = [',
        "        'email_verified_at' => 'datetime',",
        "        'password'          => 'hashed',",
        '    ];',
        '',
        '    public function tokens()',
        '    {',
        '        return $this->morphMany(PersonalAccessToken::class, \'tokenable\');',
        '    }',
        '}',
        '',
      ].join('\n'))
      success('app/Models/User.php (standalone)')
    }

    // AuthController
    const authCtrlDest = path.join(controllersDir, 'AuthController.php')
    if (!fs.existsSync(authCtrlDest)) {
      fs.writeFileSync(authCtrlDest, [
        '<?php',
        '',
        '// ============================================================',
        `// STANDALONE — generated by export.js v8 for: ${tatName}`,
        '// ============================================================',
        '',
        'namespace App\\Http\\Controllers;',
        '',
        'use Illuminate\\Routing\\Controller;',
        'use Illuminate\\Http\\Request;',
        'use Illuminate\\Http\\JsonResponse;',
        'use Illuminate\\Support\\Facades\\Hash;',
        'use Illuminate\\Validation\\ValidationException;',
        'use Laravel\\Sanctum\\Sanctum;',
        'use App\\Models\\User;',
        'use App\\Models\\PersonalAccessToken;',
        '',
        'class AuthController extends Controller',
        '{',
        '    public function __construct()',
        '    {',
        '        Sanctum::usePersonalAccessTokenModel(PersonalAccessToken::class);',
        '    }',
        '',
        '    public function register(Request $request): JsonResponse',
        '    {',
        '        $validated = $request->validate([',
        "            'name'     => 'required|string|max:255',",
        `            'email'    => 'required|email|unique:App\\\\Models\\\\User,email',`,
        "            'password' => 'required|string|min:8|confirmed',",
        '        ]);',
        '',
        '        $user = User::create([',
        "            'name'     => \$validated['name'],",
        "            'email'    => \$validated['email'],",
        "            'password' => Hash::make(\$validated['password']),",
        '        ]);',
        '',
        "        \$token = \$user->createToken('arkzen-token')->plainTextToken;",
        '',
        "        return response()->json(['user' => \$user, 'token' => \$token], 201);",
        '    }',
        '',
        '    public function login(Request $request): JsonResponse',
        '    {',
        '        $validated = $request->validate([',
        "            'email'    => 'required|email',",
        "            'password' => 'required|string',",
        '        ]);',
        '',
        "        \$user = User::where('email', \$validated['email'])->first();",
        '',
        "        if (!\$user || !Hash::check(\$validated['password'], \$user->password)) {",
        '            throw ValidationException::withMessages([',
        "                'email' => ['The provided credentials are incorrect.'],",
        '            ]);',
        '        }',
        '',
        '        $user->tokens()->delete();',
        "        \$token = \$user->createToken('arkzen-token')->plainTextToken;",
        '',
        "        return response()->json(['user' => \$user, 'token' => \$token]);",
        '    }',
        '',
        '    public function logout(Request $request): JsonResponse',
        '    {',
        '        $request->user()->currentAccessToken()->delete();',
        "        return response()->json(['message' => 'Logged out successfully']);",
        '    }',
        '',
        '    public function me(Request $request): JsonResponse',
        '    {',
        '        return response()->json($request->user());',
        '    }',
        '}',
        '',
      ].join('\n'))
      success('app/Http/Controllers/AuthController.php (standalone)')
    }
  }

  // ── 5i. bootstrap/app.php — standalone, wires resolver + routes ────

  log('Configuring backend...')

  fs.writeFileSync(path.join(PROJ_BACK, 'bootstrap', 'app.php'), [
    '<?php',
    '',
    'use Illuminate\\Foundation\\Application;',
    'use Illuminate\\Foundation\\Configuration\\Exceptions;',
    'use Illuminate\\Foundation\\Configuration\\Middleware;',
    '',
    'return Application::configure(basePath: dirname(__DIR__))',
    '    ->withRouting(',
    "        web:      __DIR__.'/../routes/web.php',",
    "        api:      __DIR__.'/../routes/api.php',",
    "        channels: __DIR__.'/../routes/channels.php',",
    "        commands: __DIR__.'/../routes/console.php',",
    "        health:   '/up',",
    '    )',
    '    ->withMiddleware(function (Middleware $middleware): void {',
    '        // Resolve the correct Sanctum PersonalAccessToken model BEFORE',
    '        // auth:sanctum runs — prevents 401 on all authenticated routes.',
    '        $middleware->prepend(\\App\\Http\\Middleware\\ArkzenSanctumTokenResolver::class);',
    '    })',
    '    ->withExceptions(function (Exceptions $exceptions): void {',
    "        \$exceptions->shouldRenderJsonWhen(fn(\$request) => \$request->is('api/*'));",
    '    })->create();',
    '',
  ].join('\n'))
  success('bootstrap/app.php')

  // ── 5j. bootstrap/providers.php — strip engine-only providers ──────

  const provPath = path.join(PROJ_BACK, 'bootstrap', 'providers.php')
  if (fs.existsSync(provPath)) {
    let prov = fs.readFileSync(provPath, 'utf-8')
    // Strip engine-only providers (ArkzenServiceProvider uses RegistryReader)
    prov = prov
      .replace(/\s*App\\Providers\\Arkzen\\ArkzenServiceProvider::class,?\n?/g, '\n')
      .replace(/\s*App\\Providers\\AppServiceProvider::class,?\n?/g, '\n')
    // Keep BroadcastServiceProvider only when realtime is used
    if (!hasRealtime) {
      prov = prov.replace(/\s*Illuminate\\Broadcasting\\BroadcastServiceProvider::class,?\n?/g, '\n')
    }
    // Clean up blank lines and write
    prov = prov.replace(/\n{3,}/g, '\n\n')
    fs.writeFileSync(provPath, prov)
  }
  success('bootstrap/providers.php')

  // ── 5k. .env ────────────────────────────────────────────────────────

  const dbPath = path.join(PROJ_BACK, 'database', 'database.sqlite')
  const envEx  = path.join(PROJ_BACK, '.env.example')

  if (fs.existsSync(envEx)) {
    let env = fs.readFileSync(envEx, 'utf-8')

    env = env
      .replace(/APP_NAME=.*/,        `APP_NAME=${tatName}`)
      .replace(/APP_ENV=.*/,         'APP_ENV=local')
      .replace(/APP_DEBUG=.*/,       'APP_DEBUG=true')
      .replace(/APP_URL=.*/,         'APP_URL=http://localhost:8001')
      .replace(/DB_CONNECTION=.*/,   'DB_CONNECTION=sqlite')
      .replace(/DB_HOST=.*/,         '# DB_HOST=127.0.0.1')
      .replace(/DB_PORT=.*/,         '# DB_PORT=3306')
      .replace(/DB_DATABASE=.*/,     `DB_DATABASE=${dbPath}`)
      .replace(/# DB_DATABASE=.*/,   `DB_DATABASE=${dbPath}`)
      .replace(/DB_USERNAME=.*/,     '# DB_USERNAME=root')
      .replace(/DB_PASSWORD=.*/,     '# DB_PASSWORD=')
      .replace(/QUEUE_CONNECTION=.*/, 'QUEUE_CONNECTION=database')
      .replace(/SESSION_DRIVER=.*/,  'SESSION_DRIVER=database')

    if (hasRealtime && !env.includes('REVERB_APP_ID=')) {
      env += [
        '',
        'BROADCAST_CONNECTION=reverb',
        'REVERB_APP_ID=arkzen',
        'REVERB_APP_KEY=arkzen-key',
        'REVERB_APP_SECRET=arkzen-secret',
        'REVERB_HOST=localhost',
        'REVERB_PORT=8080',
        'REVERB_SCHEME=http',
      ].join('\n')
    }

    if (hasMail && !env.includes('MAIL_MAILER=')) {
      env += [
        '',
        'MAIL_MAILER=log',
        'MAIL_FROM_ADDRESS=hello@example.com',
        `MAIL_FROM_NAME="${tatName}"`,
      ].join('\n')
    }

    fs.writeFileSync(path.join(PROJ_BACK, '.env'), env)
    success('.env')
  }

  // ── 5l. Storage symlink ──────────────────────────────────────────────

  try {
    execSync('php artisan storage:link --force', { cwd: PROJ_BACK, stdio: 'pipe' })
    success('storage symlink (public/storage → storage/app/public)')
  } catch { warn('Storage link skipped — run: php artisan storage:link') }

  // ── 5m. Artisan commands ─────────────────────────────────────────────

  log('Generating app key...')
  try {
    execSync('php artisan key:generate --force', { cwd: PROJ_BACK, stdio: 'pipe' })
    success('App key generated')
  } catch { warn('App key will be generated on first run') }

  if (sqlitePrebuilt) {
    success('Migrations skipped — pre-built sqlite already contains all tables')
  } else {
    // Deduplicate personal_access_tokens migrations before running
    // (the base backend can have multiple copies from engine bootstrapping)
    const migrationsDir = path.join(PROJ_BACK, 'database', 'migrations')
    if (fs.existsSync(migrationsDir)) {
      const seen = new Set()
      fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.php') && f.includes('personal_access_tokens'))
        .sort()
        .forEach((f, i) => {
          if (i > 0) { // keep only the first (oldest timestamp)
            fs.unlinkSync(path.join(migrationsDir, f))
            warn(`Removed duplicate migration: ${f}`)
          } else {
            seen.add(f)
          }
        })
    }
    log('Running migrations...')
    try {
      const migrateOut = execSync('php artisan migrate --force 2>&1', { cwd: PROJ_BACK }).toString()
      success('Migrations complete')
      migrateOut.trim().split('\n').filter(l => l.trim()).forEach(l => success('  ' + l))
    } catch (e) {
      warn('Migrations failed — run manually: php artisan migrate')
      const errOut = (e.stdout || e.message || '').toString().trim()
      errOut.split('\n').filter(l => l.trim()).slice(0, 8).forEach(l => warn('  ' + l))
    }
  }

  if (copiedSeeders.length) {
    log('Running seeders...')
    try {
      execSync('php artisan db:seed --force', { cwd: PROJ_BACK, stdio: 'pipe' })
      success('Seeders complete')
    } catch { warn('Seeders failed — run: php artisan db:seed') }
  }

  // ── 5n. Regenerate Composer classmap ─────────────────────────────────
  // vendor/composer/autoload_classmap.php is generated inside the engine's
  // backend and contains absolute paths pointing at the engine folder.
  // Every exported tatemono gets this stale classmap unless we regenerate it
  // here — otherwise Composer tries to load classes from the engine path
  // instead of the exported project path, causing "Failed to open stream"
  // errors on every exported tatemono that has namespace-rewritten classes.

  log('Regenerating Composer classmap...') 
  try {
    execSync('composer dump-autoload --optimize --quiet', { cwd: PROJ_BACK, stdio: 'pipe' })
    success('Composer classmap regenerated (vendor/composer/autoload_classmap.php)')
  } catch { warn('composer dump-autoload failed — run manually: cd backend && composer dump-autoload') }

} // end hasBackend

// ─────────────────────────────────────────────
// STEP 6 — start.js FOR EXPORTED PROJECT
// ─────────────────────────────────────────────

log('Writing start.js...')

const startLines = [
  `const { spawn } = require('child_process')`,
  `const path      = require('path')`,
  `const FRONT     = path.join(__dirname, 'frontend')`,
  hasBackend  ? `const BACK      = path.join(__dirname, 'backend')` : null,
  ``,
  `function run(label, cmd, args, cwd, color) {`,
  `  const colors = { frontend:'\\x1b[36m', backend:'\\x1b[35m', queue:'\\x1b[33m', reverb:'\\x1b[34m' }`,
  `  const c = colors[color] || '', r = '\\x1b[0m'`,
  `  const p = spawn(cmd, args, { cwd, stdio: 'pipe', env: { ...process.env, FORCE_COLOR: '1' } })`,
  `  const out = d => String(d).trim().split('\\n').forEach(l => l && console.log(\`\${c}[\${label}]\${r} \${l}\`))`,
  `  p.stdout?.on('data', out)`,
  `  p.stderr?.on('data', out)`,
  `  p.on('exit', code => code && code !== 0 && console.log(\`\${c}[\${label}]\${r} exited \${code}\`))`,
  `  return p`,
  `}`,
  ``,
  `console.log('\\n  Starting ${tatName}...')`,
  hasBackend  ? `console.log('  Backend:  http://localhost:8001')` : null,
  hasRealtime ? `console.log('  Reverb:   ws://localhost:8080')` : null,
  `console.log('  Frontend: http://localhost:3001\\n')`,
  ``,
  hasBackend  ? `const backend  = run('backend', 'php', ['artisan', 'serve', '--port=8001'], BACK, 'backend')` : null,
  hasJobs     ? `const queue    = run('queue',   'php', ['artisan', 'queue:work', '--queue=default,heavy', '--sleep=3', '--tries=3'], BACK, 'queue')` : null,
  hasRealtime ? `const reverb   = run('reverb',  'php', ['artisan', 'reverb:start', '--host=0.0.0.0', '--port=8080', '--debug'], BACK, 'reverb')` : null,
  `const frontend = run('frontend', 'npm', ['run', 'dev'], FRONT, 'frontend')`,
  ``,
  `process.on('SIGINT', () => {`,
  hasBackend  ? `  backend?.kill()` : null,
  hasJobs     ? `  queue?.kill()` : null,
  hasRealtime ? `  reverb?.kill()` : null,
  `  frontend.kill()`,
  `  process.exit(0)`,
  `})`,
].filter(l => l !== null).join('\n')

fs.writeFileSync(path.join(PROJECT_DIR, 'start.js'), startLines)
success('start.js')

// ─────────────────────────────────────────────
// STEP 7 — README
// ─────────────────────────────────────────────

fs.writeFileSync(path.join(PROJECT_DIR, 'README.md'), `# ${tatName}

Generated by Arkzen export.js v7.

## Start

\`\`\`bash
node start.js
\`\`\`

| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:3001      |
| Backend  | http://localhost:8001      |${hasRealtime ? '\n| Reverb   | ws://localhost:8080        |' : ''}

## First run

\`\`\`bash
cd backend
php artisan key:generate
php artisan migrate
php artisan db:seed   # if seeders exist
\`\`\`

## Deploy

Push \`projects/${tatName}/\` to GitHub or a server.
`)
success('README.md')

// ─────────────────────────────────────────────
// STEP 8 — .gitignore
// ─────────────────────────────────────────────

fs.writeFileSync(path.join(PROJECT_DIR, '.gitignore'), [
  '**/node_modules/', '**/vendor/', '**/.next/',
  '**/.env', '**/database/database.sqlite',
  '**/.env.local', '*.log', '.DS_Store',
].join('\n'))

// ─────────────────────────────────────────────
// DONE — SUMMARY
// ─────────────────────────────────────────────

divider()
console.log(`\n  ✓ EXPORTED: ${tatName}`)
console.log(`  Version: v7`)
console.log(`  Type:    ${hasBackend ? 'Full stack (frontend + backend)' : 'Static (frontend only)'}`)
console.log(`  Auth:    ${hasAuth ? 'Yes — standalone ArkzenSanctumTokenResolver wired' : 'No'}`)
console.log(`  Run:     cd projects/${tatName} && node start.js`)
console.log(`  Deploy:  push projects/${tatName}/ to GitHub`)
divider()