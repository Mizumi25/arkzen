#!/usr/bin/env node

// ============================================================
// ARKZEN ENGINE — START SCRIPT
// Starts the Arkzen Engine (frontend + backend + queue worker + reverb)
// Usage: node start.js
// ============================================================

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

const ROOT_DIR    = __dirname
const ENGINE_DIR  = path.join(ROOT_DIR, 'engine')
const FRONTEND_DIR = path.join(ENGINE_DIR, 'frontend')
const BACKEND_DIR  = path.join(ENGINE_DIR, 'backend')

function log(src, msg) {
  let prefix = ''
  if (src === 'frontend') prefix = '\x1b[36m[Frontend]\x1b[0m'
  else if (src === 'backend') prefix = '\x1b[35m[Backend] \x1b[0m'
  else if (src === 'queue') prefix = '\x1b[33m[Queue]   \x1b[0m'
  else if (src === 'reverb') prefix = '\x1b[35m[Reverb]  \x1b[0m'
  console.log(`${prefix} ${msg}`)
}

function checkSetup() {
  const artisan    = path.join(BACKEND_DIR, 'artisan')
  const nodeModules = path.join(FRONTEND_DIR, 'node_modules')

  if (!fs.existsSync(artisan)) {
    console.log('\n  ✗ Engine not set up yet. Run: node setup.js\n')
    process.exit(1)
  }

  if (!fs.existsSync(nodeModules)) {
    console.log('\n  ✗ Frontend packages not installed. Run: node setup.js\n')
    process.exit(1)
  }
}

function startBackend() {
  log('backend', 'Starting Laravel on http://localhost:8000')

  const proc = spawn('php', ['artisan', 'serve', '--port=8000'], {
    cwd: BACKEND_DIR,
    stdio: 'pipe',
  })

  proc.stdout.on('data', (data) => {
    String(data).trim().split('\n').forEach(line => {
      if (line.trim()) log('backend', line.trim())
    })
  })

  proc.stderr.on('data', (data) => {
    String(data).trim().split('\n').forEach(line => {
      if (line.trim()) log('backend', line.trim())
    })
  })

  proc.on('exit', (code) => {
    if (code !== 0) log('backend', `Exited with code ${code}`)
  })

  return proc
}

function startQueueWorker() {
  log('queue', 'Starting queue worker (php artisan queue:work --queue=default,heavy --sleep=3 --tries=3)')

  const spawnWorker = () => {
    const proc = spawn('php', ['artisan', 'queue:work', '--queue=default,heavy', '--sleep=3', '--tries=3'], {
      cwd: BACKEND_DIR,
      stdio: 'pipe',
      env: process.env,   // Pass environment so worker sees .env variables
    })

    proc.stdout.on('data', (data) => {
      String(data).trim().split('\n').forEach(line => {
        if (line.trim()) log('queue', line.trim())
      })
    })

    proc.stderr.on('data', (data) => {
      String(data).trim().split('\n').forEach(line => {
        if (line.trim()) log('queue', line.trim())
      })
    })

    proc.on('exit', (code) => {
      if (code !== 0) {
        log('queue', `Exited with code ${code}, restarting in 3 seconds...`)
        setTimeout(spawnWorker, 3000)
      }
    })

    return proc
  }

  return spawnWorker()
}

function startReverb() {
  log('reverb', 'Starting Laravel Reverb WebSocket server on port 8080')

  const proc = spawn('php', ['artisan', 'reverb:start', '--host=0.0.0.0', '--port=8080', '--debug'], {
    cwd: BACKEND_DIR,
    stdio: 'pipe',
    env: process.env,   // Pass environment so Reverb sees .env variables
  })

  proc.stdout.on('data', (data) => {
    String(data).trim().split('\n').forEach(line => {
      if (line.trim()) log('reverb', line.trim())
    })
  })

  proc.stderr.on('data', (data) => {
    String(data).trim().split('\n').forEach(line => {
      if (line.trim()) log('reverb', line.trim())
    })
  })

  proc.on('exit', (code) => {
    if (code !== 0) log('reverb', `Exited with code ${code}`)
  })

  return proc
}

function startFrontend() {
  log('frontend', 'Starting Next.js + Arkzen Watcher on http://localhost:3000')

  const proc = spawn('npm', ['run', 'dev'], {
    cwd: FRONTEND_DIR,
    stdio: 'pipe',
    env: { ...process.env, FORCE_COLOR: '1' },
  })

  proc.stdout.on('data', (data) => {
    String(data).trim().split('\n').forEach(line => {
      if (line.trim()) log('frontend', line.trim())
    })
  })

  proc.stderr.on('data', (data) => {
    String(data).trim().split('\n').forEach(line => {
      if (line.trim()) log('frontend', line.trim())
    })
  })

  proc.on('exit', (code) => {
    if (code !== 0) log('frontend', `Exited with code ${code}`)
  })

  return proc
}

console.log('\n╔════════════════════════════════════════╗')
console.log('║         ARKZEN ENGINE STARTING         ║')
console.log('╚════════════════════════════════════════╝\n')

checkSetup()

// Create storage symlink
const storageLink = path.join(BACKEND_DIR, 'storage')
const publicStorageLink = path.join(BACKEND_DIR, 'public', 'storage')
if (!fs.existsSync(publicStorageLink)) {
  try {
    require('child_process').execSync('php artisan storage:link --force', {
      cwd: BACKEND_DIR,
      stdio: 'pipe'
    })
    console.log('  ✓ Storage symlink created')
  } catch (e) {
    console.log('  ⚠ Storage symlink failed (run: php artisan storage:link)')
  }
}

const backend  = startBackend()
const queue    = startQueueWorker()
const reverb   = startReverb()
const frontend = startFrontend()

process.on('SIGINT', () => {
  console.log('\n\n  Shutting down Arkzen Engine...')
  backend.kill()
  queue.kill()
  reverb.kill()
  frontend.kill()
  process.exit(0)
})

console.log('\n  Tatemonos folder: tatemonos/your-project/core.tsx')
console.log('  Engine watches:   engine/frontend/tatemono/')
console.log('  Export project:   node export.js project-name\n')