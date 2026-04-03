#!/usr/bin/env node

// ============================================================
// ARKZEN ENGINE — NEW PROJECT GENERATOR
// Creates a fresh client project based on the engine
// Usage: node new.js project-name
// ============================================================

const { execSync } = require('child_process')
const fs   = require('fs')
const path = require('path')

const ENGINE_DIR   = __dirname
const FRONTEND_DIR = path.join(ENGINE_DIR, 'frontend')
const BACKEND_DIR  = path.join(ENGINE_DIR, 'backend')

// Default projects folder — sits next to arkzen-engine
const PROJECTS_DIR = path.join(ENGINE_DIR, '..', 'projects')

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function log(msg)     { console.log(`\n  ✦ ${msg}`) }
function success(msg) { console.log(`  ✓ ${msg}`) }
function error(msg)   { console.log(`  ✗ ${msg}`); process.exit(1) }
function divider()    { console.log('\n' + '─'.repeat(50)) }

function run(cmd, cwd) {
  execSync(cmd, { cwd, stdio: 'inherit' })
}

function copyDir(src, dest) {
  fs.cpSync(src, dest, {
    recursive: true,
    filter: (s) => {
      // Skip node_modules and vendor — will reinstall
      return !s.includes('node_modules') && !s.includes('/vendor/')
    }
  })
}

// ─────────────────────────────────────────────
// VALIDATE
// ─────────────────────────────────────────────

const projectName = process.argv[2]

if (!projectName) {
  console.log('\n  Usage: node new.js project-name')
  console.log('  Example: node new.js sm-store\n')
  process.exit(1)
}

if (!/^[a-z0-9-]+$/.test(projectName)) {
  error('Project name must be lowercase with hyphens only. Example: sm-store')
}

const PROJECT_DIR  = path.join(PROJECTS_DIR, projectName)
const PROJ_FRONT   = path.join(PROJECT_DIR, 'frontend')
const PROJ_BACK    = path.join(PROJECT_DIR, 'backend')
const PROJ_MODULES = path.join(PROJECT_DIR, 'modules')

if (fs.existsSync(PROJECT_DIR)) {
  error(`Project "${projectName}" already exists at ${PROJECT_DIR}`)
}

// ─────────────────────────────────────────────
// CREATE PROJECT
// ─────────────────────────────────────────────

divider()
console.log(`\n  ARKZEN — Creating project: ${projectName}\n`)
divider()

// Create project directories
fs.mkdirSync(PROJECT_DIR,  { recursive: true })
fs.mkdirSync(PROJ_FRONT,   { recursive: true })
fs.mkdirSync(PROJ_BACK,    { recursive: true })
fs.mkdirSync(PROJ_MODULES, { recursive: true })
success('Project directories created')

// ─── FRONTEND ────────────────────────────────
log('Setting up frontend...')
copyDir(FRONTEND_DIR, PROJ_FRONT)
success('Frontend files copied')

// Empty the modules folder in the new project
const projModulesInFront = path.join(PROJ_FRONT, 'modules')
fs.mkdirSync(projModulesInFront, { recursive: true })

// Update frontend .env.local for this project
const frontEnvPath = path.join(PROJ_FRONT, '.env.local')
const frontPort    = getFreePort(3000)
const backPort     = getFreePort(8000)

fs.writeFileSync(frontEnvPath, `# Arkzen Project: ${projectName}
NEXT_PUBLIC_PROJECT_NAME=${projectName}
NEXT_PUBLIC_API_URL=http://localhost:${backPort}
ARKZEN_BACKEND_URL=http://localhost:${backPort}
ARKZEN_ENGINE_SECRET=arkzen-secret-123
FRONTEND_PORT=${frontPort}
`)
success(`Frontend .env.local created (port ${frontPort})`)

// Install frontend packages
log('Installing frontend packages...')
run('npm install', PROJ_FRONT)
success('Frontend packages installed')

// ─── BACKEND ─────────────────────────────────
log('Setting up backend...')
copyDir(BACKEND_DIR, PROJ_BACK)
success('Backend files copied')

// Install composer packages
log('Installing backend packages...')
run('composer install --quiet', PROJ_BACK)
success('Backend packages installed')

// Set up backend .env
const backEnvSrc  = path.join(PROJ_BACK, '.env.example')
const backEnvDest = path.join(PROJ_BACK, '.env')
const dbPath      = path.join(PROJ_BACK, 'database', 'database.sqlite')

if (fs.existsSync(backEnvSrc)) {
  let envContent = fs.readFileSync(backEnvSrc, 'utf-8')
  envContent = envContent
    .replace(/APP_NAME=.*/,       `APP_NAME=${projectName}`)
    .replace(/APP_URL=.*/,        `APP_URL=http://localhost:${backPort}`)
    .replace(/DB_CONNECTION=.*/,  'DB_CONNECTION=sqlite')
    .replace(/DB_HOST=.*/,        '# DB_HOST=')
    .replace(/DB_PORT=.*/,        '# DB_PORT=')
    .replace(/DB_DATABASE=.*/,    `DB_DATABASE=${dbPath}`)
    .replace(/DB_USERNAME=.*/,    '# DB_USERNAME=')
    .replace(/DB_PASSWORD=.*/,    '# DB_PASSWORD=')

  envContent += `\nARKZEN_ENGINE_SECRET=arkzen-secret-123\n`
  fs.writeFileSync(backEnvDest, envContent)
  success('Backend .env configured')
}

// Create SQLite database file
fs.writeFileSync(dbPath, '')
success('SQLite database created')

// Generate app key
run('php artisan key:generate --force', PROJ_BACK)
success('Laravel app key generated')

// Create required Arkzen directories
const dirs = [
  path.join(PROJ_BACK, 'routes', 'modules'),
  path.join(PROJ_BACK, 'database', 'migrations', 'arkzen'),
  path.join(PROJ_BACK, 'database', 'seeders', 'arkzen'),
  path.join(PROJ_BACK, 'app', 'Models', 'Arkzen'),
]
dirs.forEach(d => fs.mkdirSync(d, { recursive: true }))
success('Arkzen directories created')

// Run base migrations
run('php artisan migrate --force', PROJ_BACK)
success('Base migrations complete')

// Initialize project registry
const registryPath = path.join(PROJECT_DIR, 'arkzen.json')
fs.writeFileSync(registryPath, JSON.stringify({
  engine:  '1.0.0',
  project: projectName,
  modules: [],
}, null, 2))
success('arkzen.json initialized')

// Write project start script
const startScript = `#!/usr/bin/env node
const { spawn } = require('child_process')
const path = require('path')

const FRONT = path.join(__dirname, 'frontend')
const BACK  = path.join(__dirname, 'backend')

console.log('\\n  Starting ${projectName}...\\n')

const backend = spawn('php', ['artisan', 'serve', '--port=${backPort}'], {
  cwd: BACK, stdio: 'inherit'
})

const frontend = spawn('npm', ['run', 'dev'], {
  cwd: FRONT, stdio: 'inherit',
  env: { ...process.env, PORT: '${frontPort}' }
})

process.on('SIGINT', () => {
  backend.kill()
  frontend.kill()
  process.exit(0)
})
`
fs.writeFileSync(path.join(PROJECT_DIR, 'start.js'), startScript)
success('Project start.js created')

// ─── DONE ────────────────────────────────────
divider()
console.log(`
  ✓ PROJECT CREATED: ${projectName}

  Location:
    ${PROJECT_DIR}

  To start the project:
    cd ${PROJECT_DIR}
    node start.js

  Frontend: http://localhost:${frontPort}
  Backend:  http://localhost:${backPort}

  Drop tatemonos into:
    ${PROJ_MODULES}/

  Then the engine builds everything automatically.
`)
divider()

// ─────────────────────────────────────────────
// PORT HELPER
// Simple incrementing port finder
// ─────────────────────────────────────────────

function getFreePort(base) {
  // Check existing projects for used ports
  if (!fs.existsSync(PROJECTS_DIR)) return base

  const projects = fs.readdirSync(PROJECTS_DIR).filter(p => {
    return fs.statSync(path.join(PROJECTS_DIR, p)).isDirectory()
  })

  const usedPorts = new Set()
  for (const proj of projects) {
    const envPath = path.join(PROJECTS_DIR, proj, 'frontend', '.env.local')
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8')
      const match = content.match(/FRONTEND_PORT=(\d+)/)
      if (match) usedPorts.add(parseInt(match[1]))
      const backMatch = content.match(/ARKZEN_BACKEND_URL=.*:(\d+)/)
      if (backMatch) usedPorts.add(parseInt(backMatch[1]))
    }
  }

  let port = base
  while (usedPorts.has(port)) port++
  return port
}
