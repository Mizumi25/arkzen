#!/usr/bin/env node

// ============================================================
// ARKZEN ENGINE — EXPORT SCRIPT v4
// Exports a single tatemono as a standalone project
// Usage: node export.js <tatemono-name>
// Example: node export.js notes
//          node export.js portfolio
//          node export.js inventory-management
// ============================================================

const { execSync } = require('child_process')
const fs   = require('fs')
const path = require('path')

const ROOT_DIR      = __dirname
const ENGINE_DIR    = path.join(ROOT_DIR, 'engine')
const FRONTEND_DIR  = path.join(ENGINE_DIR, 'frontend')
const BACKEND_DIR   = path.join(ENGINE_DIR, 'backend')
const TATEMONOS_DIR = path.join(ROOT_DIR, 'tatemonos')
const PROJECTS_DIR  = path.join(ROOT_DIR, 'projects')

function log(msg)     { console.log(`\n  ✦ ${msg}`) }
function success(msg) { console.log(`  ✓ ${msg}`) }
function warn(msg)    { console.log(`  ⚠ ${msg}`) }
function fail(msg)    { console.log(`  ✗ ${msg}`) }
function divider()    { console.log('\n' + '─'.repeat(50)) }

// ─────────────────────────────────────────────
// VALIDATE INPUT
// ─────────────────────────────────────────────

const tatName = process.argv[2]
if (!tatName) {
  console.log('\n  Usage: node export.js <tatemono-name>')
  console.log('  Example: node export.js notes')
  console.log('  Example: node export.js portfolio')
  console.log('\n  Available tatemonos:')
  if (fs.existsSync(TATEMONOS_DIR)) {
    fs.readdirSync(TATEMONOS_DIR).forEach(f => {
      const corePath = path.join(TATEMONOS_DIR, f, 'core.tsx')
      if (fs.existsSync(corePath)) console.log(`    - ${f}`)
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

divider()
console.log(`\n  ARKZEN — Exporting tatemono: ${tatName}\n`)
divider()

// ─────────────────────────────────────────────
// PARSER HELPERS
// ─────────────────────────────────────────────

function extractSection(content, marker) {
  const start = content.indexOf(`/* @arkzen:${marker}`)
  if (start === -1) return null
  const openEnd = content.indexOf('*/', start)
  if (openEnd === -1) return null
  const endMarker = `/* @arkzen:${marker}:end */`
  const end = content.indexOf(endMarker)
  if (end === -1) return content.slice(start + `/* @arkzen:${marker}`.length, openEnd).trim()
  return content.slice(openEnd + 2, end).trim()
}

function parseMeta(raw) {
  const result = {}
  if (!raw) return result
  raw.split('\n').forEach(line => {
    const idx = line.indexOf(':')
    if (idx > -1) {
      result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
    }
  })
  return result
}

function parseApi(raw) {
  const result = {}
  if (!raw) return result
  raw.split('\n').forEach(line => {
    const idx = line.indexOf(':')
    if (idx > -1) {
      const key = line.slice(0, idx).trim()
      if (['model', 'controller', 'prefix'].includes(key)) {
        result[key] = line.slice(idx + 1).trim()
      }
    }
  })
  return result
}

function toPascal(str) {
  return str.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')
}

function toCamel(str) {
  const p = toPascal(str)
  return p[0].toLowerCase() + p.slice(1)
}

// ─────────────────────────────────────────────
// MIGRATION GENERATOR
// Mirrors engine/backend/app/Arkzen/Builders/MigrationBuilder.php
// Used as fallback when no engine migration file exists
// ─────────────────────────────────────────────

function parseDatabase(raw) {
  const result = { table: '', timestamps: true, softDeletes: false, columns: {}, indexes: [] }
  if (!raw) return result

  const lines = raw.split('\n')
  let mode     = 'root'
  let lastCol  = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const indent = line.search(/\S/)

    if (indent === 0) {
      if (trimmed.startsWith('table:'))       { result.table       = trimmed.slice(6).trim(); continue }
      if (trimmed.startsWith('timestamps:'))  { result.timestamps  = trimmed.slice(11).trim() !== 'false'; continue }
      if (trimmed.startsWith('softDeletes:')) { result.softDeletes = trimmed.slice(12).trim() === 'true'; continue }
      if (trimmed === 'columns:')             { mode = 'columns'; continue }
      if (trimmed === 'indexes:')             { mode = 'indexes'; continue }
      if (trimmed === 'seeder:')              { mode = 'seeder';  continue }
    }

    if (mode === 'columns') {
      if (indent === 2 && !trimmed.startsWith('-')) {
        lastCol = trimmed.replace(':', '').trim()
        result.columns[lastCol] = {}
        continue
      }
      if (indent === 4 && lastCol) {
        const idx = trimmed.indexOf(':')
        if (idx > -1) {
          const k = trimmed.slice(0, idx).trim()
          const v = trimmed.slice(idx + 1).trim()
          result.columns[lastCol][k] = v === 'true' ? true : v === 'false' ? false : isNaN(v) ? v : Number(v)
        }
      }
    }

    if (mode === 'indexes') {
      if (trimmed.startsWith('- columns:')) {
        const cols = trimmed.replace('- columns:', '').trim().replace(/[\[\]]/g, '').split(',').map(s => s.trim())
        result.indexes.push({ columns: cols, unique: false })
      }
      if (trimmed.startsWith('unique:') && result.indexes.length > 0) {
        result.indexes[result.indexes.length - 1].unique = trimmed.slice(7).trim() === 'true'
      }
    }
  }

  return result
}

function generateMigrationFromDatabase(dbRaw, tatSnake) {
  const db        = parseDatabase(dbRaw)
  const tableName = db.table || tatSnake
  const className = tableName.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join('')

  const typeMap = {
    integer: 'integer', bigInteger: 'bigInteger', string: 'string',
    text: 'text', longText: 'longText', decimal: 'decimal', float: 'float',
    boolean: 'boolean', date: 'date', datetime: 'dateTime',
    timestamp: 'timestamp', json: 'json', uuid: 'uuid',
  }

  const colLines = []
  for (const [name, cfg] of Object.entries(db.columns)) {
    const type   = cfg.type || 'string'
    const method = typeMap[type] || 'string'

    if (cfg.primary && cfg.autoIncrement) { colLines.push(`            $table->id();`); continue }
    if (type === 'uuid' && cfg.primary)   { colLines.push(`            $table->uuid('${name}')->primary();`); continue }

    if (cfg.foreign) {
      const [refTable] = cfg.foreign.split('.')
      const onDelete   = cfg.onDelete || 'cascade'
      const nullable   = cfg.nullable ? '->nullable()' : ''
      colLines.push(`            $table->foreignId('${name}')${nullable}->constrained('${refTable}')->onDelete('${onDelete}');`)
      continue
    }

    let call = `$table->${method}('${name}'`
    if (method === 'string' && cfg.length)    call += `, ${cfg.length}`
    if (method === 'decimal') {
      const p = cfg.precision || 8
      const s = cfg.scale     || 2
      call = `$table->decimal('${name}', ${p}, ${s}`
    }
    call += ')'
    if (cfg.nullable) call += '->nullable()'
    if (cfg.unique)   call += '->unique()'
    if (cfg.default !== undefined) {
      const def = typeof cfg.default === 'string' ? `'${cfg.default}'` : cfg.default
      call += `->default(${def})`
    }
    if (cfg.unsigned) call += '->unsigned()'
    colLines.push(`            ${call};`)
  }

  const indexLines = db.indexes.map(idx => {
    const cols   = `['${idx.columns.join("', '")}']`
    const method = idx.unique ? 'unique' : 'index'
    return `            $table->${method}(${cols});`
  })

  const timestamps  = db.timestamps  ? `\n            $table->timestamps();`  : ''
  const softDeletes = db.softDeletes ? `\n            $table->softDeletes();` : ''
  const allCols     = [...colLines, ...(indexLines.length ? [''] : []), ...indexLines].join('\n')

  return `<?php

// ============================================================
// ARKZEN GENERATED MIGRATION — ${tableName}
// Generated by export.js from @arkzen:database section
// ============================================================

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('${tableName}', function (Blueprint $table) {
${allCols}${timestamps}${softDeletes}
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('${tableName}');
    }
};
`
}

// ─────────────────────────────────────────────
// READ TATEMONO
// ─────────────────────────────────────────────

const content    = fs.readFileSync(tatPath, 'utf-8')
const meta       = parseMeta(extractSection(content, 'meta'))
const apiSection = parseApi(extractSection(content, 'api'))
const layout     = meta.layout || 'base'
const authProp   = meta.auth === 'true' ? 'true' : 'false'
const pascal     = toPascal(tatName)
const camel      = toCamel(tatName)
const modelName  = (apiSection.model      && apiSection.model      !== '_none') ? apiSection.model      : null
const ctrlName   = (apiSection.controller && apiSection.controller !== '_none') ? apiSection.controller : null
const isStatic   = !modelName || !ctrlName

const components = extractSection(content, 'components')
const page       = extractSection(content, 'page')
const animation  = extractSection(content, 'animation')

console.log(`  Tatemono: ${tatName}`)
console.log(`  Layout:   ${layout}`)
console.log(`  Type:     ${isStatic ? 'Static (frontend only)' : `Full stack — model: ${modelName}, controller: ${ctrlName}`}`)

// ─────────────────────────────────────────────
// SETUP PROJECT DIRECTORY
// ─────────────────────────────────────────────

if (fs.existsSync(PROJECT_DIR)) {
  log('Overwriting existing export...')
  fs.rmSync(PROJECT_DIR, { recursive: true, force: true })
}
fs.mkdirSync(PROJECT_DIR, { recursive: true })

// ─────────────────────────────────────────────
// COPY FRONTEND BASE
// ─────────────────────────────────────────────

log('Copying frontend base...')
fs.cpSync(FRONTEND_DIR, PROJ_FRONT, {
  recursive: true,
  filter: (src) => {
    if (src.includes('node_modules')) return false
    if (src.includes('.next')) return false
    if (src.includes('/tatemono/')) return false
    if (src.includes('/arkzen/generated/')) return false
    if (src.includes('arkzen.json')) return false
    if (path.basename(src) === 'arkzen.ts') return false
    if (src.includes('/arkzen/core/watcher')) return false
    if (src.includes('/arkzen/core/builder')) return false
    if (src.includes('/arkzen/core/parser')) return false
    if (src.includes('/arkzen/core/registry')) return false
    if (src.includes('/arkzen/core/backend-bridge')) return false
    const rel = path.relative(FRONTEND_DIR, src)
    if (rel.startsWith('app') && !['app', 'app/layout.tsx', 'app/page.tsx'].includes(rel) && !rel.startsWith('app/api')) return false
    return true
  }
})
log('Copying node_modules...')
fs.cpSync(path.join(FRONTEND_DIR, 'node_modules'), path.join(PROJ_FRONT, 'node_modules'), { recursive: true })
success('Frontend base ready')

// ─────────────────────────────────────────────
// GENERATE FRONTEND FILES
// ─────────────────────────────────────────────

log('Generating frontend files...')

// animations/name.ts
if (animation) {
  const animDir    = path.join(PROJ_FRONT, 'animations')
  const animFnName = camel + 'Animations'
  fs.mkdirSync(animDir, { recursive: true })
  const cleanAnim = animation
    .replace(/import.*from ['"]gsap[^'"]*['"][;]?\n?/g, '')
    .replace(/import React.*['"][;]?\n?/g, '')
    .replace(/gsap\.registerPlugin\([^)]*\)[;]?\n?/g, '')
    .replace(`const ${animFnName}`, `export const ${animFnName}`)
    .trim()
  fs.writeFileSync(path.join(animDir, `${tatName}.ts`), [
    `import { gsap } from 'gsap'`,
    `import { ScrollTrigger } from 'gsap/ScrollTrigger'`,
    `import React from 'react'`,
    `gsap.registerPlugin(ScrollTrigger)`,
    ``,
    cleanAnim,
  ].join('\n'))
  success(`animations/${tatName}.ts`)
}

// app/tatemono-name/_components.tsx + page.tsx
const pageDir       = path.join(PROJ_FRONT, 'app', tatName)
const layoutComp    = layout === 'auth' ? 'AuthLayout' : layout === 'blank' ? 'BlankLayout' : 'BaseLayout'
const animImport    = animation ? `import { ${camel}Animations, pageVariants } from '@/animations/${tatName}'` : ''
const componentName = pascal + 'Page'
const animFnName    = camel + 'Animations'
fs.mkdirSync(pageDir, { recursive: true })

// _components.tsx — raw tatemono code, untouched
const exportedPage = (page || '').trim().replace(`const ${componentName}`, `export const ${componentName}`)
fs.writeFileSync(path.join(pageDir, '_components.tsx'), [
  `'use client'`,
  `// ${pascal} Components — generated from tatemono: ${tatName}`,
  ``,
  components ? components.replace(/'use client'[;]?\n?/, '').trim() : '',
  ``,
  `// ─── Page ──────────────────────────────────────────────────`,
  exportedPage,
].join('\n'))
success(`app/${tatName}/_components.tsx`)

// page.tsx — clean wrapper
fs.writeFileSync(path.join(pageDir, 'page.tsx'), [
  `'use client'`,
  `// ${pascal} Page wrapper — generated from tatemono: ${tatName}`,
  `import React, { useRef, useEffect } from 'react'`,
  `import { motion } from 'framer-motion'`,
  `import { ${layoutComp} } from '@/arkzen/core/layouts/${layoutComp}'`,
  animImport,
  `import { ${componentName} } from './_components'`,
  ``,
  `const ArkzenPage_${pascal} = () => {`,
  `  const pageRef = useRef<HTMLDivElement>(null)`,
  `  useEffect(() => {`,
  `    if (!pageRef.current) return`,
  animation ? `    const cleanup = ${animFnName}(pageRef); return cleanup` : `    // No animations`,
  `  }, [])`,
  `  return (`,
  `    <${layoutComp} auth={${authProp}}>`,
  `      <motion.div ref={pageRef} variants={{}} initial="initial" animate="animate" exit="exit">`,
  `        <${componentName} />`,
  `      </motion.div>`,
  `    </${layoutComp}>`,
  `  )`,
  `}`,
  `export default ArkzenPage_${pascal}`,
].join('\n'))
success(`app/${tatName}/page.tsx`)

// ─────────────────────────────────────────────
// FIX: root app/page.tsx re-exports from the
// tatemono route instead of being a verbatim
// copy. The old copyFileSync caused the import
// './_components' to resolve to app/_components
// (missing) instead of app/<name>/_components.
// ─────────────────────────────────────────────
fs.writeFileSync(path.join(PROJ_FRONT, 'app', 'page.tsx'), [
  `'use client'`,
  `// Root page — delegates to tatemono: ${tatName}`,
  `export { default } from './${tatName}/page'`,
].join('\n'))
success(`app/page.tsx → ${tatName}`)

// ─────────────────────────────────────────────
// BACKEND (skip entirely if static)
// ─────────────────────────────────────────────

if (!isStatic) {
  log('Copying backend base...')
  fs.cpSync(BACKEND_DIR, PROJ_BACK, {
    recursive: true,
    filter: (src) => {
      if (src.includes('/vendor/')) return false
      if (src.includes('database.sqlite')) return false
      if (src.includes('/app/Arkzen/')) return false
      if (src.includes('ArkzenEngineController')) return false
      if (src.includes('ArkzenEngineMiddleware')) return false
      if (src.includes('/app/Providers/Arkzen/')) return false
      if (src.includes('/routes/arkzen.php')) return false
      if (src.includes('/routes/modules/')) return false
      if (src.includes('/migrations/arkzen/')) return false
      if (src.includes('/database/seeders/')) return false
      if (src.includes('/Models/Arkzen/')) return false
      if (src.includes('/Controllers/Arkzen/')) return false
      return true
    }
  })
  log('Copying vendor...')
  fs.cpSync(path.join(BACKEND_DIR, 'vendor'), path.join(PROJ_BACK, 'vendor'), { recursive: true })
  success('Backend base ready')

  // Base Controller.php
  fs.mkdirSync(path.join(PROJ_BACK, 'app', 'Http', 'Controllers'), { recursive: true })
  fs.writeFileSync(path.join(PROJ_BACK, 'app', 'Http', 'Controllers', 'Controller.php'), `<?php

namespace App\\Http\\Controllers;

abstract class Controller
{
    //
}
`)
  success('app/Http/Controllers/Controller.php')

  // Model
  const engModelPath = path.join(BACKEND_DIR, 'app', 'Models', 'Arkzen', `${modelName}.php`)
  if (fs.existsSync(engModelPath)) {
    fs.mkdirSync(path.join(PROJ_BACK, 'app', 'Models'), { recursive: true })
    const m = fs.readFileSync(engModelPath, 'utf-8')
      .replace('namespace App\\Models\\Arkzen;', 'namespace App\\Models;')
    fs.writeFileSync(path.join(PROJ_BACK, 'app', 'Models', `${modelName}.php`), m)
    success(`app/Models/${modelName}.php`)
  } else {
    fail(`app/Models/${modelName}.php NOT FOUND — run the engine and build this tatemono first`)
  }

  // Controller
  const engCtrlPath = path.join(BACKEND_DIR, 'app', 'Http', 'Controllers', 'Arkzen', `${ctrlName}.php`)
  if (fs.existsSync(engCtrlPath)) {
    const c = fs.readFileSync(engCtrlPath, 'utf-8')
      .replace('namespace App\\Http\\Controllers\\Arkzen;', 'namespace App\\Http\\Controllers;')
      .replace(`use App\\Models\\Arkzen\\${modelName};`, `use App\\Models\\${modelName};`)
    fs.writeFileSync(path.join(PROJ_BACK, 'app', 'Http', 'Controllers', `${ctrlName}.php`), c)
    success(`app/Http/Controllers/${ctrlName}.php`)
  } else {
    fail(`app/Http/Controllers/${ctrlName}.php NOT FOUND — run the engine and build this tatemono first`)
  }

  // Migration — copy from engine if exists, otherwise generate from @arkzen:database
  const engMigDir  = path.join(BACKEND_DIR, 'database', 'migrations', 'arkzen')
  const modelSnake = modelName.toLowerCase()
  const tatSnake   = tatName.replace(/-/g, '_')
  let migCopied    = false

  if (fs.existsSync(engMigDir)) {
    const migFiles = fs.readdirSync(engMigDir).filter(f => f.endsWith('.php'))
    const createMig = migFiles.find(f =>
      f.includes('_create_') && (f.includes(tatSnake) || f.includes(modelSnake))
    )
    if (createMig) {
      fs.copyFileSync(
        path.join(engMigDir, createMig),
        path.join(PROJ_BACK, 'database', 'migrations', createMig)
      )
      success(`database/migrations/${createMig}`)
      migCopied = true
    }
  }

  if (!migCopied) {
    // Generate migration from @arkzen:database section
    const dbRaw = extractSection(content, 'database')
    if (dbRaw) {
      const generatedMig = generateMigrationFromDatabase(dbRaw, tatSnake)
      const timestamp    = new Date().toISOString().replace(/[-T:\.Z]/g, '').slice(0, 14)
      const migFileName  = `${timestamp}_create_${tatSnake}_table.php`
      fs.writeFileSync(path.join(PROJ_BACK, 'database', 'migrations', migFileName), generatedMig)
      success(`database/migrations/${migFileName} (generated from tatemono)`)
    } else {
      fail(`No migration and no @arkzen:database section found for ${tatName}`)
    }
  }

  // Route file
  const engRoutePath = path.join(BACKEND_DIR, 'routes', 'modules', `${tatName}.php`)
  if (fs.existsSync(engRoutePath)) {
    const r = fs.readFileSync(engRoutePath, 'utf-8')
      .replace(/App\\Http\\Controllers\\Arkzen\\/g, 'App\\Http\\Controllers\\')
    fs.writeFileSync(path.join(PROJ_BACK, 'routes', `${tatName}.php`), r)
    success(`routes/${tatName}.php`)
  } else {
    fail(`routes/modules/${tatName}.php NOT FOUND — run the engine and build this tatemono first`)
  }

  // api.php
  fs.writeFileSync(path.join(PROJ_BACK, 'routes', 'api.php'), [
    '<?php',
    `require __DIR__.'/${tatName}.php';`,
  ].join('\n'))
  success('routes/api.php')

  // Seeders
  const engSeederDir = path.join(BACKEND_DIR, 'database', 'seeders', 'arkzen')
  const allSeeders   = []
  if (fs.existsSync(engSeederDir)) {
    const seederFiles = fs.readdirSync(engSeederDir).filter(f =>
      f.toLowerCase().includes(modelName.toLowerCase())
    )
    if (seederFiles.length > 0) {
      fs.mkdirSync(path.join(PROJ_BACK, 'database', 'seeders'), { recursive: true })
      seederFiles.forEach(sf => {
        const s = fs.readFileSync(path.join(engSeederDir, sf), 'utf-8')
          .replace('namespace Database\\Seeders\\Arkzen;', 'namespace Database\\Seeders;')
        const match = s.match(/class\s+(\w+)\s+extends/)
        if (match) allSeeders.push(match[1])
        fs.writeFileSync(path.join(PROJ_BACK, 'database', 'seeders', sf), s)
        success(`database/seeders/${sf}`)
      })
    }
  }

  // DatabaseSeeder.php
  fs.mkdirSync(path.join(PROJ_BACK, 'database', 'seeders'), { recursive: true })
  const seederCalls = allSeeders.map(s => `        $this->call(${s}::class);`).join('\n')
  fs.writeFileSync(path.join(PROJ_BACK, 'database', 'seeders', 'DatabaseSeeder.php'), `<?php

namespace Database\\Seeders;

use Illuminate\\Database\\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
${seederCalls}
    }
}
`)
  success('database/seeders/DatabaseSeeder.php')

  // Configure backend
  log('Configuring backend...')

  const dbPath = path.join(PROJ_BACK, 'database', 'database.sqlite')
  fs.writeFileSync(dbPath, '')

  const envEx = path.join(PROJ_BACK, '.env.example')
  if (fs.existsSync(envEx)) {
    let env = fs.readFileSync(envEx, 'utf-8')
    env = env
      .replace(/APP_NAME=.*/, `APP_NAME=${tatName}`)
      .replace(/APP_ENV=.*/, 'APP_ENV=local')
      .replace(/APP_DEBUG=.*/, 'APP_DEBUG=true')
      .replace(/DB_CONNECTION=.*/, 'DB_CONNECTION=sqlite')
      .replace(/DB_HOST=.*/, '# DB_HOST=')
      .replace(/DB_PORT=.*/, '# DB_PORT=')
      .replace(/DB_DATABASE=.*/, `DB_DATABASE=${dbPath}`)
      .replace(/DB_USERNAME=.*/, '# DB_USERNAME=')
      .replace(/DB_PASSWORD=.*/, '# DB_PASSWORD=')
    fs.writeFileSync(path.join(PROJ_BACK, '.env'), env)
  }

  fs.writeFileSync(path.join(PROJ_BACK, 'bootstrap', 'app.php'), `<?php

use Illuminate\\Foundation\\Application;
use Illuminate\\Foundation\\Configuration\\Exceptions;
use Illuminate\\Foundation\\Configuration\\Middleware;
use Illuminate\\Support\\Facades\\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            \$routesPath = base_path('routes');
            \$skip = ['web.php', 'console.php', 'api.php'];
            foreach (glob(\$routesPath . '/*.php') as \$routeFile) {
                if (!in_array(basename(\$routeFile), \$skip)) {
                    Route::middleware('api')->group(\$routeFile);
                }
            }
        },
    )
    ->withMiddleware(function (Middleware \$middleware): void {
        //
    })
    ->withExceptions(function (Exceptions \$exceptions): void {
        //
    })->create();
`)
  success('bootstrap/app.php')

  const provPath = path.join(PROJ_BACK, 'bootstrap', 'providers.php')
  if (fs.existsSync(provPath)) {
    let prov = fs.readFileSync(provPath, 'utf-8')
    prov = prov.replace(/\s*App\\Providers\\Arkzen\\ArkzenServiceProvider::class,?\n?/, '\n')
    fs.writeFileSync(provPath, prov)
  }

  ;[
    path.join(PROJ_BACK, 'app', 'Arkzen'),
    path.join(PROJ_BACK, 'app', 'Http', 'Controllers', 'Arkzen'),
    path.join(PROJ_BACK, 'app', 'Models', 'Arkzen'),
    path.join(PROJ_BACK, 'app', 'Providers', 'Arkzen'),
  ].forEach(dir => {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
  })
  success('Engine folders cleaned')

  log('Generating app key...')
  try { execSync('php artisan key:generate --force', { cwd: PROJ_BACK, stdio: 'pipe' }); success('App key generated') }
  catch { warn('App key will generate on first run') }

  log('Running migrations...')
  try { execSync('php artisan migrate --force', { cwd: PROJ_BACK, stdio: 'pipe' }); success('Migrations complete') }
  catch { warn('Migrations failed — check log on first start') }

  log('Running seeders...')
  try { execSync('php artisan db:seed --force', { cwd: PROJ_BACK, stdio: 'pipe' }); success('Seeders complete') }
  catch { warn('No seeders to run') }

} else {
  log('Static tatemono — no backend needed')
  success('Frontend only export')
}

// ─────────────────────────────────────────────
// CONFIGURE FRONTEND
// ─────────────────────────────────────────────

log('Configuring frontend...')

fs.writeFileSync(path.join(PROJ_FRONT, 'next.config.js'), isStatic
  ? `/** @type {import('next').NextConfig} */
const nextConfig = { experimental: { forceSwcTransforms: false } }
module.exports = nextConfig
`
  : `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { forceSwcTransforms: false },
  async rewrites() {
    return [{ source: '/api/:path*', destination: 'http://127.0.0.1:8001/api/:path*' }]
  },
}
module.exports = nextConfig
`)

const pkgPath = path.join(PROJ_FRONT, 'package.json')
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  pkg.name = tatName
  pkg.scripts = {
    dev:   'NEXT_IGNORE_INCORRECT_LOCKFILE=1 NEXT_DISABLE_SWC=1 next dev --webpack --port 3001',
    build: 'next build',
    start: 'next start --port 3001',
  }
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
}
success('Frontend configured')

// ─────────────────────────────────────────────
// START SCRIPT
// ─────────────────────────────────────────────

if (isStatic) {
  fs.writeFileSync(path.join(PROJECT_DIR, 'start.js'), [
    `const { spawn } = require('child_process')`,
    `const path = require('path')`,
    `const FRONT = path.join(__dirname, 'frontend')`,
    `console.log('\\n  Starting ${tatName}...')`,
    `console.log('  URL: http://localhost:3001\\n')`,
    `const frontend = spawn('npm', ['run', 'dev'], { cwd: FRONT, stdio: 'inherit' })`,
    `process.on('SIGINT', () => { frontend.kill(); process.exit(0) })`,
  ].join('\n'))
} else {
  fs.writeFileSync(path.join(PROJECT_DIR, 'start.js'), [
    `const { spawn } = require('child_process')`,
    `const path = require('path')`,
    `const FRONT = path.join(__dirname, 'frontend')`,
    `const BACK  = path.join(__dirname, 'backend')`,
    `console.log('\\n  Starting ${tatName}...')`,
    `console.log('  Frontend: http://localhost:3001')`,
    `console.log('  Backend:  http://localhost:8001\\n')`,
    `const backend  = spawn('php', ['artisan', 'serve', '--port=8001'], { cwd: BACK, stdio: 'inherit' })`,
    `const frontend = spawn('npm', ['run', 'dev'], { cwd: FRONT, stdio: 'inherit' })`,
    `process.on('SIGINT', () => { backend.kill(); frontend.kill(); process.exit(0) })`,
  ].join('\n'))
}

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
console.log(`  Type:   ${isStatic ? 'Static (frontend only)' : 'Full stack (frontend + backend)'}`)
console.log(`  Run:    cd projects/${tatName} && node start.js`)
console.log(`  Deploy: push projects/${tatName} to GitHub`)
divider()