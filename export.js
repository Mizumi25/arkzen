#!/usr/bin/env node

// ============================================================
// ARKZEN ENGINE — EXPORT SCRIPT v8
//
// Philosophy: COPY EVERYTHING. No cleverness. No rewriting.
// The engine works. The exported project IS the engine output.
// We just isolate one tatemono from the multi-tatemono engine.
//
// What this does:
//   1. Trigger engine build for the tatemono (same as the watcher)
//   2. Copy the ENTIRE backend as-is — same namespaces, same
//      prefixes, same DB connections, same file structure
//   3. Copy the ENTIRE frontend as-is — same imports, same paths
//   4. Point the exported backend at the tatemono's specific
//      .sqlite file (no rename, just correct path in .env)
//   5. Strip ONLY engine-internal routes/middleware that exported
//      projects don't need (ArkzenEngineController, arkzen.php)
//   6. Write a tiny ModuleRouteServiceProvider that loads the
//      module route file directly (avoids double /api prefix)
//   7. Write start.js + run migrations
//
// What this does NOT do:
//   - Rewrite namespaces
//   - Strip table prefixes
//   - Rename sqlite files
//   - Remove DB connections
//   - Strip route prefixes
//   - Any other "clever" transformation that breaks things
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
function skip(msg)    { console.log(`  – ${msg} (skipped)`) }
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
// READ TATEMONO META (minimal — only for start.js flags)
// ─────────────────────────────────────────────

const content     = fs.readFileSync(tatPath, 'utf-8')
const hasBackend  = content.includes('@arkzen:api') || content.includes('@arkzen:database:') || content.includes('@arkzen:jobs:') || content.includes('@arkzen:events:') || content.includes('@arkzen:realtime:') || content.includes('@arkzen:notifications:') || content.includes('@arkzen:mail:') || content.includes('@arkzen:console:') || content.includes('@arkzen:routes') || content.includes('@arkzen:store:')
const hasRealtime = content.includes('@arkzen:realtime') || content.includes('@arkzen:notifications')
const hasJobs     = content.includes('@arkzen:jobs') || content.includes('@arkzen:events')
const tatSnake    = tatName.replace(/-/g, '_')   // ← ADDED

divider()
console.log(`\n  ARKZEN — Exporting tatemono: ${tatName}\n`)
divider()
console.log(`  Version:  v8 (copy-everything, engine‑style routing)`)
console.log(`  Tatemono: ${tatName}`)
console.log(`  Backend:  ${hasBackend}`)
console.log(`  Realtime: ${hasRealtime}`)
console.log(`  Jobs:     ${hasJobs}`)

// ─────────────────────────────────────────────
// CLEAN OUTPUT DIRECTORY
// ─────────────────────────────────────────────

if (fs.existsSync(PROJECT_DIR)) {
  log('Cleaning previous export...')
  fs.rmSync(PROJECT_DIR, { recursive: true, force: true })
}
fs.mkdirSync(PROJECT_DIR, { recursive: true })

// ─────────────────────────────────────────────
// STEP 1 — ENGINE BUILD
// Make sure all generated output is fresh before we copy it.
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

const tsxBin    = path.join(FRONTEND_DIR, 'node_modules', '.bin', 'tsx')
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
// STEP 2 — COPY ENTIRE BACKEND AS-IS
//
// We copy everything from engine/backend EXCEPT:
//   - vendor/          (too large; will composer install)
//   - .sqlite files    (we handle the specific one below)
//   - engine-internal routes (arkzen.php, routes/modules/)
//   - ArkzenEngineController (engine-only, not needed in export)
//   - ArkzenEngineMiddleware (engine-only)
//
// We do NOT touch:
//   - Namespaces       (keep them exactly as generated)
//   - Table names      (keep prefixes exactly as generated)
//   - DB connections   (keep exactly as generated)
//   - Route prefixes   (keep exactly as generated)
//   - File structure   (keep exactly as generated)
// ─────────────────────────────────────────────

log('Copying backend...')

fs.cpSync(BACKEND_DIR, PROJ_BACK, {
  recursive: true,
  filter: (src) => {
    const rel = path.relative(BACKEND_DIR, src).replace(/\\/g, '/')

    // Always skip vendor — will be installed fresh
    if (rel.startsWith('vendor/') || rel === 'vendor') return false

    // Skip all sqlite files — we handle the specific one below
    if (src.endsWith('.sqlite')) return false

    // Skip engine-internal controller (not needed in standalone)
    if (rel.includes('Controllers/Arkzen/ArkzenEngineController.php')) return false

    // Skip engine-internal middleware (not needed in standalone)
    if (rel.includes('Middleware/ArkzenEngineMiddleware.php')) return false

    // Skip engine-internal routes
    if (rel === 'routes/arkzen.php') return false

    // Skip engine module route loader (we'll write a provider instead)
    if (rel === 'routes/api.php') return false

    // Skip engine bootstrap/app.php (we write a standalone one below)
    if (rel === 'bootstrap/app.php') return false

    return true
  }
})
success('Backend copied (full structure preserved)')

// ─────────────────────────────────────────────
// STEP 3 — COPY FRONTEND AS-IS
//
// Copy everything from engine/frontend EXCEPT:
//   - node_modules/    (too large; copied separately)
//   - .next/           (build cache, not needed)
//   - Engine-only files that only make sense inside the engine:
//       arkzen/core/builder.ts   (builds tatemonos, not needed in export)
//       arkzen/core/watcher.ts   (watches for changes, not needed)
//       arkzen/core/backend-bridge.ts (talks to engine API, not needed)
//       validate.js              (engine validator)
//       tatemono/ dir            (source tatemonos, not needed)
//   - app/ pages for OTHER tatemonos (we copy only this one below)
// ─────────────────────────────────────────────

log('Copying frontend base...')

const ENGINE_ONLY_FRONTEND = new Set([
  'arkzen/core/builder.ts',
  'arkzen/core/watcher.ts',
  'arkzen/core/backend-bridge.ts',
  'validate.js',
  'arkzen.ts',
  'arkzen.config.ts',
])

fs.cpSync(FRONTEND_DIR, PROJ_FRONT, {
  recursive: true,
  filter: (src) => {
    const rel = path.relative(FRONTEND_DIR, src).replace(/\\/g, '/')

    if (rel.startsWith('node_modules') || rel === 'node_modules') return false
    if (rel.startsWith('.next')        || rel === '.next')         return false

    // Skip engine-only files
    if (ENGINE_ONLY_FRONTEND.has(rel)) return false

    // Skip tatemono sources
    if (rel.startsWith('tatemono/')) return false

    // Skip app/ — we copy pages selectively below
    // (root layout kept, but per-tatemono pages scoped)
    if (rel.startsWith('app/') && rel !== 'app/') {
      // Keep root layout.tsx
      if (rel === 'app/layout.tsx') return true
      // Keep ONLY this tatemono's pages
      if (rel.startsWith(`app/${tatName}`)) return true
      // Skip all other tatemono page dirs
      return false
    }

    // Skip arkzen/generated — we write auth-tatemonos.ts below
    if (rel.startsWith('arkzen/generated/')) return false

    return true
  }
})
success('Frontend base copied')

log('Copying node_modules...')
fs.cpSync(
  path.join(FRONTEND_DIR, 'node_modules'),
  path.join(PROJ_FRONT, 'node_modules'),
  { recursive: true }
)
success('Frontend node_modules copied')

// ─────────────────────────────────────────────
// STEP 4 — COPY TATEMONO'S SQLITE FILE
//
// Use the EXACT file the engine generated. Keep its name.
// Just point .env at it correctly.
// ─────────────────────────────────────────────

log('Copying SQLite database...')

const engSqlite  = path.join(BACKEND_DIR, 'database', 'arkzen', `${tatName}.sqlite`)
const destDbDir  = path.join(PROJ_BACK, 'database', 'arkzen')
const destSqlite = path.join(destDbDir, `${tatName}.sqlite`)

fs.mkdirSync(destDbDir, { recursive: true })

if (fs.existsSync(engSqlite) && fs.statSync(engSqlite).size > 0) {
  fs.copyFileSync(engSqlite, destSqlite)
  success(`database/arkzen/${tatName}.sqlite copied (pre-built, already migrated)`)
} else {
  // Create an empty file — migrations will populate it
  fs.writeFileSync(destSqlite, '')
  warn(`database/arkzen/${tatName}.sqlite not found in engine — created empty, will migrate`)
}

// ─────────────────────────────────────────────
// STEP 4b — COPY TATEMONO'S ASSETS
//
// If the tatemono has an assets/ folder, copy it to the exported
// project's public/assets/ folder, categorized by file type.
// ─────────────────────────────────────────────

log('Checking for tatemono assets...')

const srcAssetsPath = path.join(TATEMONOS_DIR, tatName, 'assets')
if (fs.existsSync(srcAssetsPath)) {
  try {
    const destAssetsDir = path.join(PROJ_FRONT, 'public', 'assets', tatName)
    fs.mkdirSync(destAssetsDir, { recursive: true })

    // Read source assets and categorize by file type
    const FILE_TYPE_MAP = {
      images: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp', '.tiff'],
      videos: ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.m4v', '.mpg', '.mpeg'],
      audio: ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a', '.wma'],
      documents: ['.pdf', '.doc', '.docx', '.txt', '.xlsx', '.xls', '.csv', '.ppt', '.pptx'],
      fonts: ['.woff', '.woff2', '.ttf', '.otf', '.eot', '.fnt'],
      archives: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'],
      data: ['.json', '.xml', '.yaml', '.yml', '.toml', '.csv'],
      code: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.h'],
    }

    const getFileType = (filename) => {
      const ext = path.extname(filename).toLowerCase()
      for (const [type, exts] of Object.entries(FILE_TYPE_MAP)) {
        if (exts.includes(ext)) return type
      }
      return 'other'
    }

    const srcFiles = fs.readdirSync(srcAssetsPath)
    for (const file of srcFiles) {
      const srcFile = path.join(srcAssetsPath, file)
      if (!fs.statSync(srcFile).isDirectory() && !file.startsWith('.')) {
        const fileType = getFileType(file)
        const typeDir = path.join(destAssetsDir, fileType)
        fs.mkdirSync(typeDir, { recursive: true })
        fs.copyFileSync(srcFile, path.join(typeDir, file))
      }
    }
    success(`Assets copied: /public/assets/${tatName}/`)
  } catch (err) {
    warn(`Could not copy assets: ${err.message}`)
  }
} else {
  success('No assets folder found (optional)')
}



// ─────────────────────────────────────────────
// STEP 5 — WRITE STANDALONE BOOTSTRAP/APP.PHP
//
// Registers the isolated database connection inside a booted()
// callback — the Config facade isn't available until the app
// is fully bootstrapped.
// ─────────────────────────────────────────────

log('Writing standalone bootstrap/app.php...')

fs.mkdirSync(path.join(PROJ_BACK, 'bootstrap'), { recursive: true })
fs.writeFileSync(path.join(PROJ_BACK, 'bootstrap', 'app.php'), `<?php

use Illuminate\\Foundation\\Application;
use Illuminate\\Foundation\\Configuration\\Exceptions;
use Illuminate\\Foundation\\Configuration\\Middleware;

\$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web:      __DIR__.'/../routes/web.php',
        channels: __DIR__.'/../routes/channels.php',
        commands: __DIR__.'/../routes/console.php',
        health:   '/up',
    )
    ->withMiddleware(function (Middleware \$middleware): void {
        \$middleware->prepend(\\App\\Http\\Middleware\\ArkzenSanctumTokenResolver::class);
    })
    ->withExceptions(function (Exceptions \$exceptions): void {
        \$exceptions->shouldRenderJsonWhen(fn(\$request) => \$request->is('api/*'));
    })->create();

\$app->booted(function () {
    \\Illuminate\\Support\\Facades\\Config::set('database.connections.${tatSnake}', [
        'driver'   => 'sqlite',
        'database' => base_path('database/arkzen/${tatName}.sqlite'),
        'prefix'   => '',
        'foreign_key_constraints' => true,
    ]);
});

return \$app;
`)
success('bootstrap/app.php (connection registered via booted callback)')

// ─────────────────────────────────────────────
// STEP 6 — MODULE ROUTE PROVIDER (engine‑style routing)
//
// The engine loads module files directly via ArkzenServiceProvider,
// bypassing api.php. This avoids the automatic /api prefix that
// api.php adds, so the module's own prefix('/api/...') works fine.
//
// We replicate that here with a standalone provider scoped to
// this one tatemono. No clever rewriting, no prefix stripping.
// ─────────────────────────────────────────────

log('Writing module route service provider...')

const routeFilePath = `routes/modules/${tatName}.php`

// 6a – Create the provider
const providerDir = path.join(PROJ_BACK, 'app', 'Providers')
const providerPath = path.join(providerDir, 'ModuleRouteServiceProvider.php')
fs.mkdirSync(providerDir, { recursive: true })

fs.writeFileSync(providerPath, `<?php

namespace App\\Providers;

use Illuminate\\Support\\ServiceProvider;
use Illuminate\\Support\\Facades\\Route;

class ModuleRouteServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        \$routeFile = base_path('${routeFilePath}');
        if (file_exists(\$routeFile)) {
            Route::middleware(['api'])
                ->group(\$routeFile);
        }
    }
}
`)
success(`app/Providers/ModuleRouteServiceProvider.php → loads ${routeFilePath}`)

// 6b – Register the provider in bootstrap/providers.php
const providersPath = path.join(PROJ_BACK, 'bootstrap', 'providers.php')
if (fs.existsSync(providersPath)) {
    let provContent = fs.readFileSync(providersPath, 'utf-8')
    // Insert the new provider before the closing bracket of the return array
    provContent = provContent.replace(
        /(\s*\]\s*;?\s*)$/,
        `    App\\Providers\\ModuleRouteServiceProvider::class,\n$1`
    )
    fs.writeFileSync(providersPath, provContent)
    success('bootstrap/providers.php → ModuleRouteServiceProvider registered')
}

// ─────────────────────────────────────────────
// STEP 7 — WRITE .ENV
//
// Based on .env.example — point DB at the EXACT sqlite file,
// using a path RELATIVE to the backend root so it works anywhere.
// ─────────────────────────────────────────────

log('Writing .env...')

const envExPath = path.join(PROJ_BACK, '.env.example')
let env = fs.existsSync(envExPath)
  ? fs.readFileSync(envExPath, 'utf-8')
  : ''

// Relative path from the backend root — works no matter where the project lives
const relativeSqlitePath = `database/arkzen/${tatName}.sqlite`

env = env
  .replace(/APP_NAME=.*/,             `APP_NAME=${tatName}`)
  .replace(/APP_ENV=.*/,              'APP_ENV=local')
  .replace(/APP_DEBUG=.*/,            'APP_DEBUG=true')
  .replace(/APP_URL=.*/,              'APP_URL=http://localhost:8001')
  .replace(/DB_CONNECTION=.*/,        'DB_CONNECTION=sqlite')
  .replace(/#?\s*DB_HOST=.*/,         '# DB_HOST=127.0.0.1')
  .replace(/#?\s*DB_PORT=.*/,         '# DB_PORT=3306')
  .replace(/#?\s*DB_DATABASE=.*/,     `DB_DATABASE=${relativeSqlitePath}`)
  .replace(/#?\s*DB_USERNAME=.*/,     '# DB_USERNAME=root')
  .replace(/#?\s*DB_PASSWORD=.*/,     '# DB_PASSWORD=')
  .replace(/QUEUE_CONNECTION=.*/,     'QUEUE_CONNECTION=database')
  .replace(/SESSION_DRIVER=.*/,       'SESSION_DRIVER=file')
  .replace(/CACHE_STORE=.*/,          'CACHE_STORE=file')
  .replace(/BROADCAST_CONNECTION=.*/, hasRealtime ? 'BROADCAST_CONNECTION=reverb' : 'BROADCAST_CONNECTION=log')

if (hasRealtime && !env.includes('REVERB_APP_ID=')) {
  env += [
    '',
    'REVERB_APP_ID=arkzen',
    'REVERB_APP_KEY=arkzen-key',
    'REVERB_APP_SECRET=arkzen-secret',
    'REVERB_HOST=localhost',
    'REVERB_PORT=8081',
    'REVERB_SCHEME=http',
  ].join('\n')
}

fs.writeFileSync(path.join(PROJ_BACK, '.env'), env)
success(`.env (DB → ${relativeSqlitePath})`)

if (hasRealtime) {
  fs.writeFileSync(path.join(PROJ_FRONT, '.env.local'), [
    'NEXT_PUBLIC_REVERB_HOST=localhost',
    'NEXT_PUBLIC_REVERB_PORT=8081',
    'NEXT_PUBLIC_REVERB_SCHEME=ws',
    'NEXT_PUBLIC_REVERB_APP_KEY=arkzen-key',
  ].join('\n'))
  success('frontend/.env.local (Reverb config)')
}

// ─────────────────────────────────────────────
// STEP 8 — WRITE FRONTEND GLUE FILES
//
// Only the minimum needed to make the standalone project work:
//   - auth-tatemonos.ts  (scoped to this one tatemono)
//   - app/page.tsx       (root redirect)
//   - next.config.js     (proxy to backend on 8001)
//   - package.json       (rename + fix scripts)
// middleware.ts is already copied from engine — it works as-is.
// ─────────────────────────────────────────────

log('Writing frontend glue files...')

// arkzen/generated/auth-tatemonos.ts — scoped to this tatemono only
const genDir = path.join(PROJ_FRONT, 'arkzen', 'generated')
fs.mkdirSync(genDir, { recursive: true })

// Copy the engine's generated file if it exists, else write a minimal one
const engAuthTatemonos = path.join(FRONTEND_DIR, 'arkzen', 'generated', 'auth-tatemonos.ts')
if (fs.existsSync(engAuthTatemonos)) {
  // The engine generated this — contains the real auth list. Scope it.
  const hasAuth = content.includes('@arkzen:meta') &&
    fs.readFileSync(engAuthTatemonos, 'utf-8').includes(`'${tatName}'`)
  fs.writeFileSync(path.join(genDir, 'auth-tatemonos.ts'),
    `// Auto-generated by export.js v8 for: ${tatName}\nexport const AUTH_TATEMONOS: string[] = ${hasAuth ? JSON.stringify([tatName]) : '[]'}\n`
  )
} else {
  const hasAuthMeta = /auth:\s*true/.test(content)
  fs.writeFileSync(path.join(genDir, 'auth-tatemonos.ts'),
    `// Auto-generated by export.js v8 for: ${tatName}\nexport const AUTH_TATEMONOS: string[] = ${hasAuthMeta ? JSON.stringify([tatName]) : '[]'}\n`
  )
}
success('arkzen/generated/auth-tatemonos.ts')

// Also copy any other generated files for this tatemono (animations, etc.)
const engGenDir = path.join(FRONTEND_DIR, 'arkzen', 'generated')
if (fs.existsSync(engGenDir)) {
  fs.readdirSync(engGenDir).forEach(f => {
    if (f === 'auth-tatemonos.ts') return // already written above
    const src = path.join(engGenDir, f)
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, path.join(genDir, f))
      success(`arkzen/generated/${f}`)
    }
  })
}

// app/page.tsx — root redirect to this tatemono
fs.mkdirSync(path.join(PROJ_FRONT, 'app'), { recursive: true })
fs.writeFileSync(path.join(PROJ_FRONT, 'app', 'page.tsx'),
  `'use client'\nimport { redirect } from 'next/navigation'\nexport default function ArkzenRoot() { redirect('/${tatName}') }\n`
)
success(`app/page.tsx → redirects to /${tatName}`)

// next.config.js — proxy /storage/* and /api/* to backend on port 8001
fs.writeFileSync(path.join(PROJ_FRONT, 'next.config.js'), `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { forceSwcTransforms: false },
  async rewrites() {
    return [
      { source: '/storage/:path*', destination: 'http://127.0.0.1:8001/storage/:path*' },
      { source: '/api/:path*', destination: 'http://127.0.0.1:8001/api/:path*' },
    ]
  },
}
module.exports = nextConfig
`)
success('next.config.js')

// package.json — rename and fix scripts for standalone use
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
// STEP 9 — STRIP ENGINE-ONLY PROVIDERS
//
// ArkzenServiceProvider depends on RegistryReader which manages
// ALL tatemonos. Not needed (or useful) in a single-tatemono export.
// AppServiceProvider is also engine-specific. Strip both.
// ─────────────────────────────────────────────

const provPath = path.join(PROJ_BACK, 'bootstrap', 'providers.php')
if (fs.existsSync(provPath)) {
  let prov = fs.readFileSync(provPath, 'utf-8')
  prov = prov
    .replace(/\s*App\\Providers\\Arkzen\\ArkzenServiceProvider::class,?\n?/g, '\n')
    .replace(/\s*App\\Providers\\AppServiceProvider::class,?\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
  fs.writeFileSync(provPath, prov)
  success('bootstrap/providers.php (engine-only providers stripped)')
}

// ─────────────────────────────────────────────
// STEP 10 — INSTALL VENDOR / COMPOSER CLASSMAP
//
// The engine's vendor/ is NOT copied (too large and has absolute paths).
// Run composer install fresh in the exported project so paths are correct.
// ─────────────────────────────────────────────

log('Installing Composer dependencies...')
try {
  execSync('composer install --no-interaction --prefer-dist --optimize-autoloader --quiet', {
    cwd: PROJ_BACK, stdio: 'pipe'
  })
  success('composer install complete')
} catch (e) {
  warn('composer install failed — run manually: cd backend && composer install')
  const msg = (e.stdout || e.stderr || e.message || '').toString().trim()
  msg.split('\n').slice(0, 5).forEach(l => l.trim() && warn('  ' + l))
}

// ─────────────────────────────────────────────
// STEP 11 — APP KEY + STORAGE LINK
// ─────────────────────────────────────────────

log('Generating app key...')
try {
  execSync('php artisan key:generate --force', { cwd: PROJ_BACK, stdio: 'pipe' })
  success('App key generated')
} catch { warn('App key failed — run: php artisan key:generate') }

try {
  execSync('php artisan storage:link --force', { cwd: PROJ_BACK, stdio: 'pipe' })
  success('Storage symlink created')
} catch { warn('Storage link failed — run: php artisan storage:link') }

// ─────────────────────────────────────────────
// STEP 12 — MIGRATIONS
//
// ALWAYS run migrations. Even though the engine's pre-built sqlite has
// tatemono tables, it lacks Laravel system tables (cache, sessions, 
// failed_jobs, etc.) created by Laravel's own migrations.
// The --step flag allows idempotent runs — existing tables are skipped.
// ─────────────────────────────────────────────

log('Running migrations...')
try {
  const out = execSync('php artisan migrate --force 2>&1', { cwd: PROJ_BACK }).toString()
  success('Migrations complete')
  out.trim().split('\n').filter(l => l.trim()).forEach(l => success('  ' + l))
} catch (e) {
  warn('Migrations failed — run manually: php artisan migrate')
  const msg = (e.stdout || e.message || '').toString().trim()
  msg.split('\n').slice(0, 8).forEach(l => l.trim() && warn('  ' + l))
}

// Seeders only needed when DB was empty (no else check needed anymore)
log('Running seeders...')
try {
  execSync('php artisan db:seed --force', { cwd: PROJ_BACK, stdio: 'pipe' })
  success('Seeders complete')
} catch { warn('Seeders failed (or none exist) — run: php artisan db:seed') }

// ─────────────────────────────────────────────
// STEP 13 — WRITE START.JS
// ─────────────────────────────────────────────

log('Writing start.js...')

const startLines = [
  `const { spawn } = require('child_process')`,
  `const path      = require('path')`,
  `const FRONT     = path.join(__dirname, 'frontend')`,
  `const BACK      = path.join(__dirname, 'backend')`,
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
  hasBackend ? `console.log('  Backend:  http://localhost:8001')` : null,
  `console.log('  Queue:    enabled')`,
  `console.log('  Reverb:   ws://localhost:8081')`,
  `console.log('  Frontend: http://localhost:3001\\n')`,
  ``,
  hasBackend ? `const backend  = run('backend',  'php', ['artisan', 'serve', '--port=8001'], BACK, 'backend')` : null,
  `const queue    = run('queue',    'php', ['artisan', 'queue:work', '--queue=default,heavy', '--sleep=3', '--tries=3'], BACK, 'queue')`,
  `const reverb   = run('reverb',   'php', ['artisan', 'reverb:start', '--host=0.0.0.0', '--port=8081', '--debug'], BACK, 'reverb')`,
  `const frontend = run('frontend', 'npm',  ['run', 'dev'], FRONT, 'frontend')`,
  ``,
  `process.on('SIGINT', () => {`,
  hasBackend ? `  backend.kill()` : null,
  `  queue.kill()`,
  `  reverb.kill()`,
  `  frontend.kill()`,
  `  process.exit(0)`,
  `})`,
].filter(l => l !== null).join('\n')

fs.writeFileSync(path.join(PROJECT_DIR, 'start.js'), startLines)
success('start.js')

// ─────────────────────────────────────────────
// STEP 14 — README + GITIGNORE
// ─────────────────────────────────────────────

fs.writeFileSync(path.join(PROJECT_DIR, 'README.md'), `# ${tatName}

Generated by Arkzen export.js v8.

## Start

\`\`\`bash
node start.js
\`\`\`

| Service  | URL                    |
|----------|------------------------|
| Frontend | http://localhost:3001  |${hasBackend ? '\n| Backend  | http://localhost:8001  |' : ''}
| Queue    | Background jobs        |
| Reverb   | ws://localhost:8081    |

## Manual setup (if needed)

\`\`\`bash
cd backend
composer install
php artisan key:generate
php artisan migrate
php artisan db:seed   # if seeders exist
\`\`\`
`)

fs.writeFileSync(path.join(PROJECT_DIR, '.gitignore'), [
  '**/node_modules/',
  '**/vendor/',
  '**/.next/',
  '**/.env',
  '**/.env.local',
  '*.log',
  '.DS_Store',
].join('\n'))

// ─────────────────────────────────────────────
// GENERATE SITEMAP FOR EXPORTED PROJECT
// ─────────────────────────────────────────────

try {
  const sitemapPath = path.join(PROJECTS_DIR, tatName, 'frontend', 'arkzen', 'core', 'sitemap.ts')
  if (fs.existsSync(sitemapPath)) {
    // Dynamically require the sitemap module
    delete require.cache[require.resolve(sitemapPath)]
    const sitemapModule = require(sitemapPath)
    if (sitemapModule.writeSitemap) {
      const publicDir = path.join(PROJECTS_DIR, tatName, 'frontend', 'public')
      sitemapModule.writeSitemap(publicDir)
      console.log(`\n  ✓ Sitemap generated: projects/${tatName}/frontend/public/sitemap.xml`)
    }
  }
} catch (err) {
  // Silently skip if sitemap generation fails (it's not critical for export)
}

// ─────────────────────────────────────────────
// DONE
// ─────────────────────────────────────────────

divider()
console.log(`\n  ✓ EXPORTED: ${tatName}`)
console.log(`  Version: v8 (copy-everything, engine‑style routing)`)
console.log(`  DB:      database/arkzen/${tatName}.sqlite`)
console.log(`  Run:     cd projects/${tatName} && node start.js`)
console.log(`  SEO:     Visit /public/sitemap.xml and submit to Google Console`)
divider()
