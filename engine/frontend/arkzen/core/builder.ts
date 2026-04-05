// ============================================================
// ARKZEN ENGINE — BUILDER v5.0
// Key changes:
//   - Handles multiple pages per tatemono
//   - Sends full remove payload (models, controllers, tables)
//   - Registry updated with pages list
// ============================================================

import * as path from 'path'
import * as fs   from 'fs'
import { parseTatemono }                                from './parser'
import { registerPage, unregisterPage, softUnregisterPage } from './router'
import { updateRegistry, removeFromRegistry }           from './registry'
import type { ParsedTatemono, BuildResult, BuildStep }  from '../types'
import { triggerBackendBuild, triggerBackendRemove }    from './backend-bridge'

export async function buildTatemono(filePath: string): Promise<BuildResult> {
  const fileName      = path.basename(filePath, '.tsx')
  const tatemonoName  = fileName === 'core'
    ? path.basename(path.dirname(filePath))
    : fileName

  const steps: BuildStep[] = []
  const errors: string[]   = []

  console.log(`\n[Arkzen Builder] ════════════════════════════════`)
  console.log(`[Arkzen Builder] Building: ${tatemonoName}`)
  console.log(`[Arkzen Builder] ════════════════════════════════`)

  // ─── STEP 1: Parse ───────────────────────────
  let parsed: ParsedTatemono
  try {
    parsed = parseTatemono(filePath)
    steps.push({
      name:    'Parse Tatemono',
      status:  'success',
      message: `Parsed ${tatemonoName} — ${parsed.databases.length} table(s), ${parsed.apis.length} resource(s), ${parsed.pages.length} page(s)`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    steps.push({ name: 'Parse Tatemono', status: 'failed', message })
    errors.push(message)
    return { success: false, tatemono: tatemonoName, steps, errors }
  }

  // ─── STEP 2: Register Frontend Pages ─────────
  try {
    registerPage(parsed)
    const routes = parsed.pages.map(p => `/${parsed.meta.name}/${p.name}`).join(', ')
    steps.push({
      name:    'Register Frontend Pages',
      status:  'success',
      message: `${parsed.pages.length} page(s) registered: ${routes}`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    steps.push({ name: 'Register Frontend Pages', status: 'failed', message })
    errors.push(message)
  }

  // ─── STEP 3: Trigger Backend Build ───────────
  try {
    await triggerBackendBuild(parsed)

    const isStatic    = parsed.databases.length === 0 && parsed.apis.length === 0
    const controllers = parsed.apis.map(a => a.controller).join(', ')

    steps.push({
      name:    'Trigger Backend Build',
      status:  'success',
      message: isStatic ? 'Static tatemono — no backend' : `Backend built: ${controllers}`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    steps.push({ name: 'Trigger Backend Build', status: 'failed', message })
    errors.push(message)
  }

  // ─── STEP 4: Update Registry ─────────────────
  try {
    updateRegistry(parsed)
    steps.push({
      name:    'Update Registry',
      status:  'success',
      message: `${tatemonoName} registered in arkzen.json`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    steps.push({ name: 'Update Registry', status: 'failed', message })
    errors.push(message)
  }

  const success = errors.length === 0

  console.log(`\n[Arkzen Builder] Build ${success ? '✓ COMPLETE' : '✗ FAILED'}: ${tatemonoName}`)
  steps.forEach(step => {
    const icon = step.status === 'success' ? '  ✓' : step.status === 'failed' ? '  ✗' : '  ○'
    console.log(`${icon} ${step.name}: ${step.message}`)
  })
  if (errors.length > 0) {
    console.log(`\n[Arkzen Builder] Errors:`)
    errors.forEach(e => console.log(`  - ${e}`))
  }

  return { success, tatemono: tatemonoName, steps, errors }
}

export async function rebuildTatemono(filePath: string): Promise<BuildResult> {
  const fileName     = path.basename(filePath, '.tsx')
  const tatemonoName = fileName === 'core'
    ? path.basename(path.dirname(filePath))
    : fileName

  console.log(`\n[Arkzen Builder] Rebuilding: ${tatemonoName}`)
  softUnregisterPage(tatemonoName)

  // Small settle delay — gives Next.js Fast Refresh time to finish its
  // current HMR cycle before new files are written. Without this, the
  // deletion of the old app/{name}/ folder triggers a full reload mid-write,
  // which causes Next.js to cache a 404 for the new pages.
  await new Promise(resolve => setTimeout(resolve, 150))

  return buildTatemono(filePath)
}

export function removeTatemono(tatemonoName: string, registry?: { models: string[]; controllers: string[]; tables: string[] }): void {
  console.log(`\n[Arkzen Builder] Removing: ${tatemonoName}`)
  unregisterPage(tatemonoName)
  removeFromRegistry(tatemonoName)

  // v5: send full payload so backend can clean EVERYTHING
  triggerBackendRemove(tatemonoName, registry)
  console.log(`[Arkzen Builder] ✓ Removed: ${tatemonoName}`)
}

export async function rebuildAll(modulesDir: string): Promise<void> {
  console.log(`\n[Arkzen Builder] Rebuilding all tatemonos from: ${modulesDir}`)

  if (!fs.existsSync(modulesDir)) {
    console.log(`[Arkzen Builder] No modules directory found. Skipping.`)
    return
  }

  const entries = fs.readdirSync(modulesDir)
  const files: string[] = []

  for (const entry of entries) {
    const entryPath = path.join(modulesDir, entry)
    const stat      = fs.statSync(entryPath)

    if (stat.isDirectory()) {
      const corePath = path.join(entryPath, 'core.tsx')
      if (fs.existsSync(corePath)) files.push(corePath)
    } else if (entry.endsWith('.tsx')) {
      files.push(entryPath)
    }
  }

  if (files.length === 0) {
    console.log(`[Arkzen Builder] No tatemonos found. Engine ready.`)
    return
  }

  console.log(`[Arkzen Builder] Found ${files.length} tatemono(s). Building...`)
  for (const file of files) {
    await buildTatemono(file)
  }
  console.log(`\n[Arkzen Builder] ✓ All tatemonos rebuilt`)
}