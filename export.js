#!/usr/bin/env node

// ============================================================
// ARKZEN ENGINE — EXPORT SCRIPT v6
//
// Architecture: Build-first, copy-everything
//
//   1. Trigger the engine builder for the tatemono (same as
//      the watcher does on file change) so all output is fresh
//   2. Copy generated frontend files from engine/frontend/app/{name}/
//   3. Copy generated backend files from every Arkzen subfolder
//      scoped to this tatemono — automatically picks up ANY new
//      builder output without ever touching this file again
//   4. Copy the full base infrastructure (config, vendor, etc.)
//   5. Write three tiny glue files:
//        middleware.ts       — standalone, no engine import
//        auth-tatemonos.ts   — single tatemono scope
//        start.js            — spawns backend + frontend (+ queue/reverb if needed)
//   6. Rewrite namespaces, strip engine internals, wire env + routes
//   7. Run migrations + seed
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
// QUICK META READER
// Only reads auth + name from YAML comment.
// Everything else comes from what the engine generated.
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

divider()
console.log(`\n  ARKZEN — Exporting tatemono: ${tatName}\n`)
divider()
console.log(`  Format:   v6`)
console.log(`  Tatemono: ${tatName}`)
console.log(`  Auth:     ${hasAuth}`)
console.log(`  Backend:  ${hasBackend}`)
console.log(`  Realtime: ${hasRealtime}`)
console.log(`  Jobs:     ${hasJobs}`)

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
// Calls builder.ts via tsx so all engine output is
// fresh before we copy anything. Same code path as
// the watcher — so export always matches dev exactly.
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
// NAMESPACE REWRITER
// All engine PHP files live under App\...\Arkzen\{TatPascal}\
// or flat App\...\Arkzen\ — rewrite to clean App\...\ for export
// ─────────────────────────────────────────────

function rewriteNamespaces(src) {
  return src
    // ── Namespace declarations ──────────────────────────────────────
    .replace(new RegExp(`namespace App\\\\Models\\\\Arkzen\\\\${tatPascal};`,                   'g'), 'namespace App\\Models;')
    .replace(/namespace App\\Models\\Arkzen;/g,                                                       'namespace App\\Models;')
    .replace(/namespace App\\Http\\Controllers\\Arkzen;/g,                                            'namespace App\\Http\\Controllers;')
    .replace(/namespace App\\Http\\Requests\\Arkzen;/g,                                               'namespace App\\Http\\Requests;')
    .replace(new RegExp(`namespace App\\\\Http\\\\Resources\\\\Arkzen\\\\${tatPascal};`,        'g'), 'namespace App\\Http\\Resources;')
    .replace(/namespace App\\Http\\Resources\\Arkzen;/g,                                              'namespace App\\Http\\Resources;')
    .replace(new RegExp(`namespace App\\\\Policies\\\\Arkzen\\\\${tatPascal};`,                 'g'), 'namespace App\\Policies;')
    .replace(/namespace App\\Policies\\Arkzen;/g,                                                     'namespace App\\Policies;')
    .replace(new RegExp(`namespace App\\\\Jobs\\\\Arkzen\\\\${tatPascal};`,                     'g'), 'namespace App\\Jobs;')
    .replace(/namespace App\\Jobs\\Arkzen;/g,                                                         'namespace App\\Jobs;')
    .replace(new RegExp(`namespace App\\\\Events\\\\Arkzen\\\\${tatPascal};`,                   'g'), 'namespace App\\Events;')
    .replace(/namespace App\\Events\\Arkzen;/g,                                                       'namespace App\\Events;')
    .replace(new RegExp(`namespace App\\\\Listeners\\\\Arkzen\\\\${tatPascal};`,                'g'), 'namespace App\\Listeners;')
    .replace(/namespace App\\Listeners\\Arkzen;/g,                                                    'namespace App\\Listeners;')
    .replace(new RegExp(`namespace App\\\\Mail\\\\Arkzen\\\\${tatPascal};`,                     'g'), 'namespace App\\Mail;')
    .replace(/namespace App\\Mail\\Arkzen;/g,                                                         'namespace App\\Mail;')
    .replace(new RegExp(`namespace App\\\\Notifications\\\\Arkzen\\\\${tatPascal};`,            'g'), 'namespace App\\Notifications;')
    .replace(/namespace App\\Notifications\\Arkzen;/g,                                               'namespace App\\Notifications;')
    .replace(new RegExp(`namespace App\\\\Console\\\\Commands\\\\Arkzen\\\\${tatPascal};`,      'g'), 'namespace App\\Console\\Commands;')
    .replace(/namespace App\\Console\\Commands\\Arkzen;/g,                                            'namespace App\\Console\\Commands;')
    .replace(/namespace Database\\Seeders\\Arkzen;/g,                                                 'namespace Database\\Seeders;')
    .replace(new RegExp(`namespace Database\\\\Factories\\\\Arkzen\\\\${tatPascal};`,           'g'), 'namespace Database\\Factories;')
    .replace(/namespace Database\\Factories\\Arkzen;/g,                                               'namespace Database\\Factories;')

    // ── use statements ──────────────────────────────────────────────
    .replace(new RegExp(`use App\\\\Models\\\\Arkzen\\\\${tatPascal}\\\\([A-Za-z0-9_]+);`,     'g'), 'use App\\Models\\$1;')
    .replace(/use App\\Models\\Arkzen\\([A-Za-z0-9_]+);/g,                                           'use App\\Models\\$1;')
    .replace(/use App\\Http\\Controllers\\Arkzen\\([A-Za-z0-9_]+);/g,                                'use App\\Http\\Controllers\\$1;')
    .replace(/use App\\Http\\Requests\\Arkzen\\([A-Za-z0-9_]+);/g,                                   'use App\\Http\\Requests\\$1;')
    .replace(new RegExp(`use App\\\\Http\\\\Resources\\\\Arkzen\\\\${tatPascal}\\\\([A-Za-z0-9_]+);`, 'g'), 'use App\\Http\\Resources\\$1;')
    .replace(new RegExp(`use App\\\\Policies\\\\Arkzen\\\\${tatPascal}\\\\([A-Za-z0-9_]+);`,   'g'), 'use App\\Policies\\$1;')
    .replace(new RegExp(`use App\\\\Jobs\\\\Arkzen\\\\${tatPascal}\\\\([A-Za-z0-9_]+);`,       'g'), 'use App\\Jobs\\$1;')
    .replace(new RegExp(`use App\\\\Events\\\\Arkzen\\\\${tatPascal}\\\\([A-Za-z0-9_]+);`,     'g'), 'use App\\Events\\$1;')
    .replace(new RegExp(`use App\\\\Listeners\\\\Arkzen\\\\${tatPascal}\\\\([A-Za-z0-9_]+);`,  'g'), 'use App\\Listeners\\$1;')
    .replace(new RegExp(`use App\\\\Mail\\\\Arkzen\\\\${tatPascal}\\\\([A-Za-z0-9_]+);`,       'g'), 'use App\\Mail\\$1;')
    .replace(new RegExp(`use App\\\\Notifications\\\\Arkzen\\\\${tatPascal}\\\\([A-Za-z0-9_]+);`, 'g'), 'use App\\Notifications\\$1;')
    .replace(new RegExp(`use App\\\\Console\\\\Commands\\\\Arkzen\\\\${tatPascal}\\\\([A-Za-z0-9_]+);`, 'g'), 'use App\\Console\\Commands\\$1;')
    .replace(new RegExp(`use Database\\\\Factories\\\\Arkzen\\\\${tatPascal}\\\\([A-Za-z0-9_]+);`, 'g'), 'use Database\\Factories\\$1;')

    // ── Database connection stripping ───────────────────────────────
    .replace(new RegExp(`DB::connection\\('${tatSnake}'\\)->`, 'g'),  'DB::')
    .replace(new RegExp(`->on\\('${tatSnake}'\\)`,             'g'),  '')
    .replace(/protected \$connection = '[^']+';/,                      '')
    .replace(/Schema::connection\('[^']+'\)->create\(/g,               'Schema::create(')
    .replace(/Schema::connection\('[^']+'\)->table\(/g,                'Schema::table(')
    .replace(/Schema::connection\('[^']+'\)->dropIfExists\(/g,         'Schema::dropIfExists(')

    // ── Table prefix stripping ──────────────────────────────────────
    .replace(new RegExp(`'${tatSnake}_([a-z_]+)'`, 'g'),              "'$1'")
}

// ─────────────────────────────────────────────
// COPY HELPERS
// ─────────────────────────────────────────────

function copyPhp(srcFile, destFile) {
  fs.mkdirSync(path.dirname(destFile), { recursive: true })
  fs.writeFileSync(destFile, rewriteNamespaces(fs.readFileSync(srcFile, 'utf-8')))
}

// Copy an entire directory of PHP files, flat into destDir
function copyPhpDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return
  fs.mkdirSync(destDir, { recursive: true })
  function walk(dir) {
    fs.readdirSync(dir).forEach(entry => {
      const full = path.join(dir, entry)
      if (fs.statSync(full).isDirectory()) { walk(full); return }
      if (!entry.endsWith('.php')) return
      const dest = path.join(destDir, entry)
      copyPhp(full, dest)
      success(path.relative(PROJECT_DIR, dest))
    })
  }
  walk(srcDir)
}

// ─────────────────────────────────────────────
// STEP 2 — COPY FRONTEND BASE
// Engine internals excluded — we never ship the
// builder/watcher/parser/registry to the client
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
    if (rel.includes('node_modules'))          return false
    if (rel.includes('.next'))                 return false
    if (rel.startsWith('tatemono'))            return false
    if (SKIP_ENGINE_FILES.has(rel))            return false
    // app/ — skip entirely, we write it ourselves below
    if (rel.startsWith('app/'))                return false
    // arkzen/generated — we write our own
    if (rel.startsWith('arkzen/generated'))    return false
    return true
  }
})

log('Copying node_modules...')
fs.cpSync(
  path.join(FRONTEND_DIR, 'node_modules'),
  path.join(PROJ_FRONT, 'node_modules'),
  { recursive: true }
)
success('Frontend base ready')

// ─────────────────────────────────────────────
// STEP 3 — COPY GENERATED FRONTEND PAGES
// The router already wrote everything correctly.
// Copy app/{tatName}/* verbatim — no modifications needed.
// ─────────────────────────────────────────────

log('Copying generated frontend pages...')

// Always copy app/layout.tsx (root layout)
const rootLayout = path.join(FRONTEND_DIR, 'app', 'layout.tsx')
if (fs.existsSync(rootLayout)) {
  fs.mkdirSync(path.join(PROJ_FRONT, 'app'), { recursive: true })
  fs.copyFileSync(rootLayout, path.join(PROJ_FRONT, 'app', 'layout.tsx'))
  success('app/layout.tsx')
}

// Copy the full generated tatemono folder
const engTatDir = path.join(FRONTEND_DIR, 'app', tatName)
const outTatDir = path.join(PROJ_FRONT,   'app', tatName)

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

// Copy animation file if generated
const engAnim = path.join(FRONTEND_DIR, 'arkzen', 'generated', `${tatName}.animations.ts`)
if (fs.existsSync(engAnim)) {
  const animDestDir = path.join(PROJ_FRONT, 'arkzen', 'generated')
  fs.mkdirSync(animDestDir, { recursive: true })
  fs.copyFileSync(engAnim, path.join(animDestDir, `${tatName}.animations.ts`))
  success(`arkzen/generated/${tatName}.animations.ts`)
}

// Copy custom layouts
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
// STEP 4 — WRITE FRONTEND GLUE FILES
// ─────────────────────────────────────────────

log('Writing frontend glue files...')

// app/page.tsx — root redirect
// Read redirect target from what the engine generated
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

// middleware.ts — standalone, reads from auth-tatemonos above
// Detect guest/auth pages by scanning what the router generated
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

fs.writeFileSync(path.join(PROJ_FRONT, 'middleware.ts'), `// Auto-generated by export.js — standalone middleware for: ${tatName}
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
success('middleware.ts (standalone)')

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

// package.json — rename, fix port
const pkgPath = path.join(PROJ_FRONT, 'package.json')
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  pkg.name     = tatName
  pkg.scripts  = {
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
  success('Frontend only export')
} else {

  // ── 5a. Copy backend base ─────────────────────────────────────────

  log('Copying backend base...')

  fs.cpSync(BACKEND_DIR, PROJ_BACK, {
    recursive: true,
    filter: (src) => {
      if (src.includes('/vendor/'))                            return false
      if (src.endsWith('.sqlite'))                             return false
      // Skip all engine-generated Arkzen dirs (we copy selectively below)
      if (src.includes('/app/Arkzen/'))                       return false
      if (src.includes('/app/Http/Controllers/Arkzen/'))      return false
      if (src.includes('/app/Http/Requests/Arkzen/'))         return false
      if (src.includes('/app/Http/Resources/Arkzen/'))        return false
      if (src.includes('/app/Http/Middleware/ArkzenEngine'))  return false
      if (src.includes('/app/Policies/Arkzen/'))              return false
      if (src.includes('/app/Jobs/Arkzen/'))                  return false
      if (src.includes('/app/Events/Arkzen/'))                return false
      if (src.includes('/app/Listeners/Arkzen/'))             return false
      if (src.includes('/app/Mail/Arkzen/'))                  return false
      if (src.includes('/app/Notifications/Arkzen/'))         return false
      if (src.includes('/app/Console/Commands/Arkzen/'))      return false
      if (src.includes('/app/Models/Arkzen/'))                return false
      if (src.includes('/app/Providers/Arkzen/'))             return false
      if (src.includes('/database/arkzen/'))                  return false
      if (src.includes('/database/migrations/arkzen/'))       return false
      if (src.includes('/database/seeders/arkzen/'))          return false
      if (src.includes('/database/factories/Arkzen/'))        return false
      if (src.includes('/routes/arkzen.php'))                 return false
      if (src.includes('/routes/modules/'))                   return false
      // Skip engine debug files
      const base = path.basename(src)
      if (['consoles_debug.json', 'roles-routes.txt', 'mail-routes.txt'].includes(base)) return false
      return true
    }
  })

  log('Copying vendor...')
  fs.cpSync(
    path.join(BACKEND_DIR, 'vendor'),
    path.join(PROJ_BACK, 'vendor'),
    { recursive: true }
  )
  success('Backend base + vendor ready')

  // ── 5b. Copy tatemono-scoped generated PHP files ──────────────────
  // Each builder outputs to a {TatPascal} subfolder — we copy them all flat.
  // When your engine adds new builders, they appear here automatically.

  log('Copying generated backend files...')

  copyPhpDir(path.join(BACKEND_DIR, 'app', 'Models',        'Arkzen', tatPascal),   path.join(PROJ_BACK, 'app', 'Models'))
  copyPhpDir(path.join(BACKEND_DIR, 'app', 'Http', 'Resources', 'Arkzen', tatPascal), path.join(PROJ_BACK, 'app', 'Http', 'Resources'))
  copyPhpDir(path.join(BACKEND_DIR, 'app', 'Policies',      'Arkzen', tatPascal),   path.join(PROJ_BACK, 'app', 'Policies'))
  copyPhpDir(path.join(BACKEND_DIR, 'app', 'Jobs',          'Arkzen', tatPascal),   path.join(PROJ_BACK, 'app', 'Jobs'))
  copyPhpDir(path.join(BACKEND_DIR, 'app', 'Events',        'Arkzen', tatPascal),   path.join(PROJ_BACK, 'app', 'Events'))
  copyPhpDir(path.join(BACKEND_DIR, 'app', 'Listeners',     'Arkzen', tatPascal),   path.join(PROJ_BACK, 'app', 'Listeners'))
  copyPhpDir(path.join(BACKEND_DIR, 'app', 'Mail',          'Arkzen', tatPascal),   path.join(PROJ_BACK, 'app', 'Mail'))
  copyPhpDir(path.join(BACKEND_DIR, 'app', 'Notifications', 'Arkzen', tatPascal),   path.join(PROJ_BACK, 'app', 'Notifications'))
  copyPhpDir(path.join(BACKEND_DIR, 'app', 'Console', 'Commands', 'Arkzen', tatPascal), path.join(PROJ_BACK, 'app', 'Console', 'Commands'))
  copyPhpDir(path.join(BACKEND_DIR, 'database', 'factories', 'Arkzen', tatPascal),  path.join(PROJ_BACK, 'database', 'factories'))
  copyPhpDir(path.join(BACKEND_DIR, 'database', 'migrations', 'arkzen', tatName),   path.join(PROJ_BACK, 'database', 'migrations'))

  // Controllers — flat under Arkzen/ (no tatemono subfolder yet)
  // Identify by Tatemono comment header in the file body
  const ctrlSrc = path.join(BACKEND_DIR, 'app', 'Http', 'Controllers', 'Arkzen')
  const ctrlDst = path.join(PROJ_BACK, 'app', 'Http', 'Controllers')
  fs.mkdirSync(ctrlDst, { recursive: true })
  if (fs.existsSync(ctrlSrc)) {
    fs.readdirSync(ctrlSrc).filter(f => f.endsWith('.php') && f !== 'ArkzenEngineController.php').forEach(f => {
      const body = fs.readFileSync(path.join(ctrlSrc, f), 'utf-8')
      if (body.includes(`Tatemono: ${tatName}`) || body.includes(`/${tatName}/`)) {
        copyPhp(path.join(ctrlSrc, f), path.join(ctrlDst, f))
        success(`app/Http/Controllers/${f}`)
      }
    })
  }

  // Requests — flat under Arkzen/ (no tatemono subfolder yet)
  const reqSrc = path.join(BACKEND_DIR, 'app', 'Http', 'Requests', 'Arkzen')
  const reqDst = path.join(PROJ_BACK, 'app', 'Http', 'Requests')
  fs.mkdirSync(reqDst, { recursive: true })
  if (fs.existsSync(reqSrc)) {
    fs.readdirSync(reqSrc).filter(f => f.endsWith('.php')).forEach(f => {
      const body = fs.readFileSync(path.join(reqSrc, f), 'utf-8')
      if (body.includes(`Tatemono: ${tatName}`) || body.includes(`/${tatName}/`)) {
        copyPhp(path.join(reqSrc, f), path.join(reqDst, f))
        success(`app/Http/Requests/${f}`)
      }
    })
  }

  // Seeders — flat under arkzen/, match by tatemono name in comment
  const seederSrc  = path.join(BACKEND_DIR, 'database', 'seeders', 'arkzen')
  const seederDst  = path.join(PROJ_BACK, 'database', 'seeders')
  const copiedSeeders = []
  fs.mkdirSync(seederDst, { recursive: true })
  if (fs.existsSync(seederSrc)) {
    fs.readdirSync(seederSrc).filter(f => f.endsWith('.php')).forEach(f => {
      const body = fs.readFileSync(path.join(seederSrc, f), 'utf-8')
      if (body.includes(`Tatemono: ${tatName}`) || body.toLowerCase().includes(tatSnake) || body.toLowerCase().includes(tatName.replace(/-/g, ''))) {
        copyPhp(path.join(seederSrc, f), path.join(seederDst, f))
        success(`database/seeders/${f}`)
        const m = body.match(/class\s+(\w+)\s+extends/)
        if (m) copiedSeeders.push(m[1])
      }
    })
  }

  // Mail blade views
  const mailViewSrc = path.join(BACKEND_DIR, 'resources', 'views', 'emails', 'arkzen', tatName)
  if (fs.existsSync(mailViewSrc)) {
    const mailViewDst = path.join(PROJ_BACK, 'resources', 'views', 'emails', tatName)
    fs.cpSync(mailViewSrc, mailViewDst, { recursive: true })
    success(`resources/views/emails/${tatName}/`)
  }

  // ── 5c. Routes ────────────────────────────────────────────────────

  log('Writing route files...')

  // Main module route file
  const routeSrc = path.join(BACKEND_DIR, 'routes', 'modules', `${tatName}.php`)
  if (fs.existsSync(routeSrc)) {
    copyPhp(routeSrc, path.join(PROJ_BACK, 'routes', `${tatName}.php`))
    success(`routes/${tatName}.php`)
  } else {
    warn(`routes/modules/${tatName}.php not found — run engine first`)
  }

  // api.php — just requires the tatemono route file
  fs.writeFileSync(path.join(PROJ_BACK, 'routes', 'api.php'),
    `<?php\n\nif (file_exists(__DIR__.'/${tatName}.php')) {\n    require __DIR__.'/${tatName}.php';\n}\n`
  )
  success('routes/api.php')

  // channels.php — extract only blocks for this tatemono
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

  // console.php — extract only schedule lines for this tatemono
  let consoleOut = `<?php\n\nuse Illuminate\\Support\\Facades\\Schedule;\n\n`
  const consoleSrc = path.join(BACKEND_DIR, 'routes', 'console.php')
  if (fs.existsSync(consoleSrc)) {
    fs.readFileSync(consoleSrc, 'utf-8').split('\n').forEach(line => {
      if (line.includes(`[${tatName}]`)) consoleOut += line + '\n'
    })
  }
  fs.writeFileSync(path.join(PROJ_BACK, 'routes', 'console.php'), consoleOut)
  success('routes/console.php')

  // ── 5d. DatabaseSeeder ────────────────────────────────────────────

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

  // ── 5e. SQLite database ──────────────────────────────────────────

  const engSqlite = path.join(BACKEND_DIR, 'database', 'arkzen', `${tatName}.sqlite`)
  const destSqlite = path.join(PROJ_BACK, 'database', 'database.sqlite')
  if (fs.existsSync(engSqlite) && fs.statSync(engSqlite).size > 0) {
    fs.copyFileSync(engSqlite, destSqlite)
    success('database/database.sqlite (copied from engine isolated DB)')
  } else {
    fs.writeFileSync(destSqlite, '')
    success('database/database.sqlite (empty — migrations will populate)')
  }

  // ── 5f. bootstrap/app.php — standalone, no engine wiring ─────────

  log('Configuring backend...')

  fs.writeFileSync(path.join(PROJ_BACK, 'bootstrap', 'app.php'), `<?php

use Illuminate\\Foundation\\Application;
use Illuminate\\Foundation\\Configuration\\Exceptions;
use Illuminate\\Foundation\\Configuration\\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web:      __DIR__.'/../routes/web.php',
        api:      __DIR__.'/../routes/api.php',
        channels: __DIR__.'/../routes/channels.php',
        commands: __DIR__.'/../routes/console.php',
        health:   '/up',
    )
    ->withMiddleware(function (Middleware \\$middleware): void {
        //
    })
    ->withExceptions(function (Exceptions \\$exceptions): void {
        \\$exceptions->shouldRenderJsonWhen(fn(\\$request) => \\$request->is('api/*'));
    })->create();
`)
  success('bootstrap/app.php')

  // bootstrap/providers.php — strip engine-only providers
  const provPath = path.join(PROJ_BACK, 'bootstrap', 'providers.php')
  if (fs.existsSync(provPath)) {
    let prov = fs.readFileSync(provPath, 'utf-8')
      .replace(/\s*App\\Providers\\Arkzen\\ArkzenServiceProvider::class,?\n?/g, '\n')
    fs.writeFileSync(provPath, prov)
  }
  success('bootstrap/providers.php')

  // ── 5g. .env ─────────────────────────────────────────────────────

  const dbPath = path.join(PROJ_BACK, 'database', 'database.sqlite')
  const envEx  = path.join(PROJ_BACK, '.env.example')

  if (fs.existsSync(envEx)) {
    let env = fs.readFileSync(envEx, 'utf-8')

    // Core settings
    env = env
      .replace(/APP_NAME=.*/,      `APP_NAME=${tatName}`)
      .replace(/APP_ENV=.*/,       'APP_ENV=local')
      .replace(/APP_DEBUG=.*/,     'APP_DEBUG=true')
      .replace(/APP_URL=.*/,       'APP_URL=http://localhost:8001')
      .replace(/DB_CONNECTION=.*/, 'DB_CONNECTION=sqlite')
      .replace(/DB_HOST=.*/,       '# DB_HOST=127.0.0.1')
      .replace(/DB_PORT=.*/,       '# DB_PORT=3306')
      .replace(/DB_DATABASE=.*/,   `DB_DATABASE=${dbPath}`)
      .replace(/# DB_DATABASE=.*/, `DB_DATABASE=${dbPath}`)
      .replace(/DB_USERNAME=.*/,   '# DB_USERNAME=root')
      .replace(/DB_PASSWORD=.*/,   '# DB_PASSWORD=')
      .replace(/QUEUE_CONNECTION=.*/, 'QUEUE_CONNECTION=database')
      .replace(/SESSION_DRIVER=.*/,   'SESSION_DRIVER=database')

    // Reverb vars if needed
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

    fs.writeFileSync(path.join(PROJ_BACK, '.env'), env)
    success('.env')
  }

  // ── 5h. Artisan commands ──────────────────────────────────────────

  log('Generating app key...')
  try {
    execSync('php artisan key:generate --force', { cwd: PROJ_BACK, stdio: 'pipe' })
    success('App key generated')
  } catch { warn('App key will be generated on first run') }

  log('Running migrations...')
  try {
    execSync('php artisan migrate --force', { cwd: PROJ_BACK, stdio: 'pipe' })
    success('Migrations complete')
  } catch (e) {
    warn('Migrations failed — will retry on first start')
    warn(e.message?.slice(0, 120) || '')
  }

  if (copiedSeeders.length) {
    log('Running seeders...')
    try {
      execSync('php artisan db:seed --force', { cwd: PROJ_BACK, stdio: 'pipe' })
      success('Seeders complete')
    } catch { warn('Seeders failed — run: php artisan db:seed') }
  }

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
// STEP 7 — .gitignore
// ─────────────────────────────────────────────

fs.writeFileSync(path.join(PROJECT_DIR, '.gitignore'), [
  '**/node_modules/', '**/vendor/', '**/.next/',
  '**/.env', '**/database/database.sqlite',
  '**/.env.local', '*.log', '.DS_Store',
].join('\n'))

// ─────────────────────────────────────────────
// DONE
// ─────────────────────────────────────────────

divider()
console.log(`\n  ✓ EXPORTED: ${tatName}`)
console.log(`  Format: v6`)
console.log(`  Type:   ${hasBackend ? 'Full stack (frontend + backend)' : 'Static (frontend only)'}`)
console.log(`  Run:    cd projects/${tatName} && node start.js`)
console.log(`  Deploy: push projects/${tatName} to GitHub`)
divider()