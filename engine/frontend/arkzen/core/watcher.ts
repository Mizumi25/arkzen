// ============================================================
// ARKZEN ENGINE — WATCHER v5.0
// No changes to watch logic — internal engine upgrades only
// ============================================================

import * as path from 'path'
import * as fs from 'fs'
import chokidar from 'chokidar'
import { buildTatemono, rebuildTatemono, removeTatemono, rebuildAll } from './builder'
import { checkBackendHealth } from './backend-bridge'
import { listRegistry, getRegistry, getRegistryEntry } from './registry'

const ROOT_DIR    = path.resolve(process.cwd(), '..', '..')
const MODULES_DIR = path.join(ROOT_DIR, 'tatemonos')
const DEBOUNCE_MS = 500

const debounceMap = new Map<string, ReturnType<typeof setTimeout>>()

function debounce(key: string, fn: () => void, delay: number = DEBOUNCE_MS): void {
  const existing = debounceMap.get(key)
  if (existing) clearTimeout(existing)
  const timer = setTimeout(() => { fn(); debounceMap.delete(key) }, delay)
  debounceMap.set(key, timer)
}

function isValidTatemono(filePath: string): boolean {
  if (path.basename(filePath) !== 'core.tsx') return false
  if (!fs.existsSync(filePath)) return false
  const content = fs.readFileSync(filePath, 'utf-8')
  if (!content.includes('/* @arkzen:meta')) {
    console.log(`[Arkzen Watcher] Not a valid tatemono (missing @arkzen:meta): ${filePath}`)
    return false
  }
  return true
}

async function rebuildAllFromRoot(): Promise<void> {
  console.log(`\n[Arkzen] Scanning existing tatemonos...`)

  if (!fs.existsSync(MODULES_DIR)) {
    console.log(`[Arkzen Builder] No tatemonos directory found at ${MODULES_DIR}. Skipping.`)
    return
  }

  const existingFolders = new Set(
    fs.readdirSync(MODULES_DIR).filter(f => {
      const folderPath = path.join(MODULES_DIR, f)
      const corePath   = path.join(folderPath, 'core.tsx')
      try { return fs.statSync(folderPath).isDirectory() && fs.existsSync(corePath) }
      catch { return false }
    })
  )

  const registry = getRegistry()
  let staleCount = 0

  for (const module of registry.modules) {
    if (!existingFolders.has(module.name)) {
      console.log(`[Arkzen] Cleaning up stale module: ${module.name}`)
      // v5: pass full registry payload for complete backend cleanup
      const entry = getRegistryEntry(module.name)
      removeTatemono(module.name, entry
        ? { models: [], controllers: [], tables: [] }
        : undefined
      )
      staleCount++
    }
  }

  if (staleCount > 0) console.log(`[Arkzen] ✓ Cleaned up ${staleCount} stale module(s)`)

  if (existingFolders.size === 0) {
    console.log(`[Arkzen Builder] No tatemonos found. Engine ready for first drop.`)
    return
  }

  console.log(`[Arkzen Builder] Found ${existingFolders.size} tatemono(s). Building...`)
  for (const folder of existingFolders) {
    const corePath = path.join(MODULES_DIR, folder, 'core.tsx')
    await buildTatemono(corePath)
  }
  console.log(`\n[Arkzen Builder] ✓ All tatemonos rebuilt`)
}

async function startup(): Promise<void> {
  console.log(`\n╔════════════════════════════════════════╗`)
  console.log(`║       ARKZEN ENGINE v5.0 STARTING      ║`)
  console.log(`╚════════════════════════════════════════╝`)
  console.log(`[Arkzen] Watching tatemonos at: ${MODULES_DIR}`)

  fs.mkdirSync(MODULES_DIR, { recursive: true })

  console.log(`\n[Arkzen] Checking Laravel backend...`)
  const backendHealthy = await checkBackendHealth()
  if (backendHealthy) {
    console.log(`[Arkzen] ✓ Laravel backend is running`)
  } else {
    console.warn(`[Arkzen] ⚠ Laravel backend not reachable. Backend builds will fail.`)
    console.warn(`[Arkzen]   Make sure Laravel is running: php artisan serve`)
  }

  await rebuildAllFromRoot()
  listRegistry()

  console.log(`\n[Arkzen] ✓ Engine ready. Drop tatemonos at: tatemonos/<name>/core.tsx\n`)
}

export async function startWatcher(): Promise<void> {
  await startup()

  const watcher = chokidar.watch(MODULES_DIR, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  })

  watcher.on('add', (filePath: string) => {
    if (!isValidTatemono(filePath)) return
    const tatemononName = path.basename(path.dirname(filePath))
    debounce(`add:${filePath}`, async () => {
      console.log(`\n[Arkzen Watcher] 📥 New tatemono: ${tatemononName}`)
      const result = await buildTatemono(filePath)
      if (result.success) {
        console.log(`[Arkzen Watcher] ✓ Build complete: ${result.tatemono}`)
      } else {
        console.error(`[Arkzen Watcher] ✗ Build failed: ${result.tatemono}`)
        result.errors.forEach(e => console.error(`  - ${e}`))
      }
    })
  })

  watcher.on('change', (filePath: string) => {
    if (!isValidTatemono(filePath)) return
    const tatemononName = path.basename(path.dirname(filePath))
    debounce(`change:${filePath}`, async () => {
      console.log(`\n[Arkzen Watcher] 🔄 Tatemono changed: ${tatemononName}`)
      const result = await rebuildTatemono(filePath)
      if (result.success) {
        console.log(`[Arkzen Watcher] ✓ Rebuild complete: ${result.tatemono}`)
      } else {
        console.error(`[Arkzen Watcher] ✗ Rebuild failed: ${result.tatemono}`)
        result.errors.forEach(e => console.error(`  - ${e}`))
      }
    })
  })

  watcher.on('unlink', (filePath: string) => {
    if (path.basename(filePath) !== 'core.tsx') return
    const tatemononName = path.basename(path.dirname(filePath))
    debounce(`unlink:${filePath}`, () => {
      console.log(`\n[Arkzen Watcher] 🗑 Tatemono removed: ${tatemononName}`)
      const entry = getRegistryEntry(tatemononName)
      removeTatemono(tatemononName, entry
        ? { models: [], controllers: [], tables: [] }
        : undefined
      )
    })
  })

  watcher.on('error', (error: Error) => console.error(`[Arkzen Watcher] ✗ Error:`, error))

  process.on('SIGINT',  () => { watcher.close(); process.exit(0) })
  process.on('SIGTERM', () => { watcher.close(); process.exit(0) })
}
