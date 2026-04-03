#!/usr/bin/env node

// ============================================================
// ARKZEN ENGINE — SETUP SCRIPT
// Run this ONCE to set up the Arkzen Engine on your machine.
// Usage: node setup.js
// ============================================================

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// ─────────────────────────────────────────────
// PATHS
// ─────────────────────────────────────────────

const ROOT_DIR    = __dirname
const ENGINE_DIR  = path.join(ROOT_DIR, 'engine')
const FRONTEND_DIR = path.join(ENGINE_DIR, 'frontend')
const BACKEND_DIR  = path.join(ENGINE_DIR, 'backend')
const PROJECTS_DIR = path.join(ROOT_DIR, 'projects')
const TATEMONOS_DIR = path.join(ROOT_DIR, 'tatemonos')

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function log(msg)     { console.log(`\n  ✦ ${msg}`) }
function success(msg) { console.log(`  ✓ ${msg}`) }
function warn(msg)    { console.log(`  ⚠ ${msg}`) }
function error(msg)   { console.log(`  ✗ ${msg}`) }
function divider()    { console.log('\n' + '─'.repeat(50)) }

function run(cmd, cwd = ROOT_DIR) {
  try {
    execSync(cmd, { cwd, stdio: 'inherit' })
    return true
  } catch (e) {
    return false
  }
}

function commandExists(cmd) {
  try {
    execSync(`${cmd} --version`, { stdio: 'ignore' })
    return true
  } catch {
    try {
      execSync(`command -v ${cmd}`, { stdio: 'ignore', shell: true })
      return true
    } catch {
      return false
    }
  }
}

// ─────────────────────────────────────────────
// CHECKS
// ─────────────────────────────────────────────

function checkRequirements() {
  divider()
  console.log('\n  ARKZEN ENGINE — SETUP\n')
  divider()

  log('Checking requirements...')

  const checks = [
    { cmd: 'node',     name: 'Node.js' },
    { cmd: 'npm',      name: 'npm' },
    { cmd: 'php',      name: 'PHP' },
    { cmd: 'composer', name: 'Composer' },
  ]

  let allGood = true

  for (const check of checks) {
    if (commandExists(check.cmd)) {
      success(`${check.name} found`)
    } else {
      error(`${check.name} not found — please install it first`)
      allGood = false
    }
  }

  if (!allGood) {
    console.log('\n  Setup cannot continue. Install missing requirements first.\n')
    process.exit(1)
  }
}

// ─────────────────────────────────────────────
// ENSURE STRUCTURE
// ─────────────────────────────────────────────

function ensureStructure() {
  divider()
  log('Ensuring Arkzen folder structure...')

  // Create required directories
  const dirs = [
    ENGINE_DIR,
    FRONTEND_DIR,
    BACKEND_DIR,
    PROJECTS_DIR,
    TATEMONOS_DIR,
    path.join(ROOT_DIR, 'tatemonos', 'inventory-management'),
  ]

  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // Move frontend/ to engine/frontend/ if not already moved
  const oldFrontend = path.join(ROOT_DIR, 'frontend')
  if (fs.existsSync(oldFrontend) && !fs.existsSync(path.join(FRONTEND_DIR, 'package.json'))) {
    log('Moving frontend/ to engine/frontend/...')
    fs.cpSync(oldFrontend, FRONTEND_DIR, { recursive: true })
    fs.rmSync(oldFrontend, { recursive: true, force: true })
    success('frontend/ moved to engine/frontend/')
  }

  // Move backend/ to engine/backend/ if not already moved
  const oldBackend = path.join(ROOT_DIR, 'backend')
  if (fs.existsSync(oldBackend) && !fs.existsSync(path.join(BACKEND_DIR, 'artisan'))) {
    log('Moving backend/ to engine/backend/...')
    fs.cpSync(oldBackend, BACKEND_DIR, { recursive: true })
    fs.rmSync(oldBackend, { recursive: true, force: true })
    success('backend/ moved to engine/backend/')
  }

  // Move flat tatemono files to folder/core.tsx structure
  const oldTatemono = path.join(ROOT_DIR, 'tatemonos', 'inventory-management.tsx')
  const newTatemono = path.join(ROOT_DIR, 'tatemonos', 'inventory-management', 'core.tsx')
  if (fs.existsSync(oldTatemono) && !fs.existsSync(newTatemono)) {
    fs.copyFileSync(oldTatemono, newTatemono)
    fs.unlinkSync(oldTatemono)
    success('tatemonos/inventory-management.tsx → tatemonos/inventory-management/core.tsx')
  }

  // Move engine tatemono folder to tatemonos/
  const oldEngTatemono = path.join(FRONTEND_DIR, 'tatemono', 'inventory-management.tsx')
  if (fs.existsSync(oldEngTatemono)) {
    fs.unlinkSync(oldEngTatemono)
    success('Removed old engine tatemono folder')
  }

  success('Folder structure correct')
}

// ─────────────────────────────────────────────
// FRONTEND SETUP
// ─────────────────────────────────────────────

function setupFrontend() {
  divider()
  log('Setting up Arkzen Frontend Engine...')

  // Ensure tatemono watch folder exists
  const tatemonoWatchDir = path.join(FRONTEND_DIR, 'tatemono')
  fs.mkdirSync(tatemonoWatchDir, { recursive: true })

  // Clear partial installs
  const nodeModulesPath = path.join(FRONTEND_DIR, 'node_modules')
  if (fs.existsSync(nodeModulesPath)) {
    log('Cleaning old node_modules...')
    fs.rmSync(nodeModulesPath, { recursive: true, force: true })
  }

  log('Installing npm packages (this takes a minute)...')
  const ok = run('npm install --no-fund --no-audit --legacy-peer-deps', FRONTEND_DIR)
  if (ok) {
    success('Frontend packages installed')
  } else {
    const ok2 = run('npm install --force --no-fund --no-audit', FRONTEND_DIR)
    if (ok2) {
      success('Frontend packages installed')
    } else {
      error('npm install failed. Try manually: cd engine/frontend && npm install --force')
      process.exit(1)
    }
  }

  // Ensure app directory exists
  const appDir = path.join(FRONTEND_DIR, 'app')
  fs.mkdirSync(appDir, { recursive: true })

  // Create base page if not exists
  const pagePath = path.join(appDir, 'page.tsx')
  if (!fs.existsSync(pagePath)) {
    fs.writeFileSync(pagePath, `export default function Home() {
  return (
    <div style={{padding: '2rem'}}>
      <h1>Arkzen Engine Running</h1>
      <p>Drop a tatemono into /tatemonos/project-name/ to get started.</p>
    </div>
  )
}
`)
  }

  // Create layout if not exists
  const layoutPath = path.join(appDir, 'layout.tsx')
  if (!fs.existsSync(layoutPath)) {
    fs.writeFileSync(layoutPath, `import '@/styles/globals.css'
import { ToastProvider } from '@/arkzen/core/components/Toast'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider position="top-right">
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
`)
  }

  success('Frontend setup complete')
}

// ─────────────────────────────────────────────
// BACKEND SETUP
// ─────────────────────────────────────────────

function setupBackend() {
  divider()
  log('Setting up Arkzen Backend Engine...')

  const artisanPath = path.join(BACKEND_DIR, 'artisan')

  if (!fs.existsSync(artisanPath)) {
    log('Installing Laravel into backend engine...')
    run(`composer create-project laravel/laravel _laravel_tmp --prefer-dist --quiet`, ENGINE_DIR)

    const tmpDir = path.join(ENGINE_DIR, '_laravel_tmp')
    if (!fs.existsSync(tmpDir)) {
      error('Laravel installation failed.')
      process.exit(1)
    }

    const laravelFiles = fs.readdirSync(tmpDir)
    for (const file of laravelFiles) {
      const src  = path.join(tmpDir, file)
      const dest = path.join(BACKEND_DIR, file)
      if (!fs.existsSync(dest)) {
        fs.cpSync(src, dest, { recursive: true })
      }
    }

    fs.rmSync(tmpDir, { recursive: true, force: true })
    success('Laravel installed into backend engine')
  } else {
    success('Laravel already installed in backend engine')
  }

  log('Installing composer packages...')
  run('composer install --quiet', BACKEND_DIR)
  success('Composer packages installed')

  log('Generating Laravel app key...')
  run('php artisan key:generate --force', BACKEND_DIR)
  success('App key generated')

  const envPath   = path.join(BACKEND_DIR, '.env')
  const envExPath = path.join(BACKEND_DIR, '.env.example')
  const dbPath    = path.join(BACKEND_DIR, 'database', 'database.sqlite')

  if (!fs.existsSync(envPath) && fs.existsSync(envExPath)) {
    fs.copyFileSync(envExPath, envPath)
  }

  let envContent = fs.readFileSync(envPath, 'utf-8')
  envContent = envContent
    .replace(/DB_CONNECTION=.*/,  'DB_CONNECTION=sqlite')
    .replace(/DB_HOST=.*/,        '# DB_HOST=')
    .replace(/DB_PORT=.*/,        '# DB_PORT=')
    .replace(/DB_DATABASE=.*/,    `DB_DATABASE=${dbPath}`)
    .replace(/DB_USERNAME=.*/,    '# DB_USERNAME=')
    .replace(/DB_PASSWORD=.*/,    '# DB_PASSWORD=')

  if (!envContent.includes('ARKZEN_ENGINE_SECRET')) {
    envContent += '\nARKZEN_ENGINE_SECRET=arkzen-secret-123\n'
  }

  fs.writeFileSync(envPath, envContent)
  success('.env configured for SQLite')

  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, '')
    success('SQLite database file created')
  }

  registerServiceProvider()
  registerMiddleware()
  fixAppPhp()

  const dirs = [
    path.join(BACKEND_DIR, 'routes', 'modules'),
    path.join(BACKEND_DIR, 'database', 'migrations', 'arkzen'),
    path.join(BACKEND_DIR, 'database', 'seeders'),
    path.join(BACKEND_DIR, 'app', 'Models', 'Arkzen'),
  ]

  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true })
  }
  success('Required directories created')

  log('Running base migrations...')
  run('php artisan migrate --force', BACKEND_DIR)
  success('Base migrations complete')
}

// ─────────────────────────────────────────────
// FIX APP.PHP — Laravel 13 routing
// ─────────────────────────────────────────────

function fixAppPhp() {
  const appPath = path.join(BACKEND_DIR, 'bootstrap', 'app.php')
  const content = `<?php
use Illuminate\\Foundation\\Application;
use Illuminate\\Foundation\\Configuration\\Exceptions;
use Illuminate\\Foundation\\Configuration\\Middleware;
use Illuminate\\Support\\Facades\\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            Route::middleware('api')
                ->prefix('arkzen')
                ->group(base_path('routes/arkzen.php'));

            // Load all Arkzen module routes
            $modulesPath = base_path('routes/modules');
            if (is_dir($modulesPath)) {
                foreach (glob($modulesPath . '/*.php') as $routeFile) {
                    require $routeFile;
                }
            }
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'arkzen.engine' => \\App\\Http\\Middleware\\ArkzenEngineMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
`
  fs.writeFileSync(appPath, content)
  success('app.php configured for Laravel 13')
}

// ─────────────────────────────────────────────
// FIX CONTROLLER BASE CLASS
// ─────────────────────────────────────────────

function fixControllerBase() {
  const controllerPath = path.join(BACKEND_DIR, 'app', 'Http', 'Controllers', 'Arkzen', 'ArkzenEngineController.php')
  if (fs.existsSync(controllerPath)) {
    let content = fs.readFileSync(controllerPath, 'utf-8')
    content = content.replace('use App\\Http\\Controllers\\Controller;', 'use Illuminate\\Routing\\Controller;')
    fs.writeFileSync(controllerPath, content)
    success('ArkzenEngineController base class fixed')
  }

  const builderPath = path.join(BACKEND_DIR, 'app', 'Arkzen', 'Builders', 'ControllerBuilder.php')
  if (fs.existsSync(builderPath)) {
    let content = fs.readFileSync(builderPath, 'utf-8')
    content = content.replace('use App\\Http\\Controllers\\Controller;', 'use Illuminate\\Routing\\Controller;')
    fs.writeFileSync(builderPath, content)
    success('ControllerBuilder base class fixed')
  }
}

// ─────────────────────────────────────────────
// REGISTER SERVICE PROVIDER
// ─────────────────────────────────────────────

function registerServiceProvider() {
  const providersPath = path.join(BACKEND_DIR, 'bootstrap', 'providers.php')

  if (!fs.existsSync(providersPath)) {
    warn('bootstrap/providers.php not found.')
    return
  }

  let content = fs.readFileSync(providersPath, 'utf-8')

  if (content.includes('ArkzenServiceProvider')) {
    success('ArkzenServiceProvider already registered')
    return
  }

  content = content.replace(
    /return \[/,
    `return [\n    App\\Providers\\Arkzen\\ArkzenServiceProvider::class,`
  )

  fs.writeFileSync(providersPath, content)
  success('ArkzenServiceProvider registered')
}

// ─────────────────────────────────────────────
// REGISTER MIDDLEWARE
// ─────────────────────────────────────────────

function registerMiddleware() {
  const appPath = path.join(BACKEND_DIR, 'bootstrap', 'app.php')
  if (!fs.existsSync(appPath)) {
    warn('bootstrap/app.php not found.')
    return
  }
  // Will be handled by fixAppPhp()
  success('Middleware will be registered via fixAppPhp')
}

// ─────────────────────────────────────────────
// INIT REGISTRY
// ─────────────────────────────────────────────

function initRegistry() {
  const registryPath = path.join(ROOT_DIR, 'arkzen.json')

  if (!fs.existsSync(registryPath)) {
    const registry = {
      engine:   '1.0.0',
      projects: [],
      tatemonos: [],
    }
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2))
    success('arkzen.json registry initialized')
  } else {
    success('arkzen.json already exists')
  }
}

// ─────────────────────────────────────────────
// DONE
// ─────────────────────────────────────────────

function printDone() {
  divider()
  console.log(`
  ✓ ARKZEN ENGINE SETUP COMPLETE

  Structure:
    engine/frontend/   ← Next.js engine core
    engine/backend/    ← Laravel engine core
    tatemonos/         ← your tatemono files
    projects/          ← exported standalone projects

  To start the engine:
    node start.js

  To export a project for deployment:
    node export.js project-name

  Drop tatemonos into:
    tatemonos/your-project/core.tsx

  `)
  divider()
}

// ─────────────────────────────────────────────
// RUN
// ─────────────────────────────────────────────

checkRequirements()
ensureStructure()
setupFrontend()
setupBackend()
fixControllerBase()
initRegistry()
printDone()
