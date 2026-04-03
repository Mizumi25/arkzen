// ============================================================
// ARKZEN ENGINE — REGISTRY v5.0
// Key changes:
//   - Stores pages[] list per tatemono entry
//   - Stores models, controllers, tables for complete cleanup
// ============================================================

import * as fs from 'fs'
import * as path from 'path'
import type { ArkzenRegistry, ArkzenRegistryEntry, ParsedTatemono } from '../types'

const REGISTRY_PATH = path.resolve(process.cwd(), 'arkzen.json')

export function getRegistry(): ArkzenRegistry {
  if (!fs.existsSync(REGISTRY_PATH)) {
    return createEmptyRegistry()
  }
  const raw = fs.readFileSync(REGISTRY_PATH, 'utf-8')
  return JSON.parse(raw) as ArkzenRegistry
}

function writeRegistry(registry: ArkzenRegistry): void {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf-8')
}

function createEmptyRegistry(): ArkzenRegistry {
  const registry: ArkzenRegistry = {
    engine: '5.0.0',
    project: path.basename(process.cwd()),
    modules: [],
  }
  writeRegistry(registry)
  return registry
}

export function updateRegistry(tatemono: ParsedTatemono): void {
  const registry = getRegistry()
  const now = new Date().toISOString()

  const existingIndex = registry.modules.findIndex(m => m.name === tatemono.meta.name)

  const entry: ArkzenRegistryEntry = {
    name:        tatemono.meta.name,
    version:     tatemono.meta.version,
    status:      'active',
    filePath:    tatemono.filePath,
    // v5: track all pages and backend resources for clean removal
    pages:       tatemono.pages.map(p => p.name),
    registered:  existingIndex === -1 ? now : registry.modules[existingIndex].registered,
    lastUpdated: now,
  }

  if (existingIndex === -1) {
    registry.modules.push(entry)
    console.log(`[Arkzen Registry] ✓ New tatemono registered: ${tatemono.meta.name} (${entry.pages.length} page(s))`)
  } else {
    registry.modules[existingIndex] = entry
    console.log(`[Arkzen Registry] ✓ Tatemono updated: ${tatemono.meta.name} (${entry.pages.length} page(s))`)
  }

  writeRegistry(registry)
}

export function removeFromRegistry(tatemononName: string): void {
  const registry = getRegistry()
  const before = registry.modules.length
  registry.modules = registry.modules.filter(m => m.name !== tatemononName)

  if (registry.modules.length < before) {
    writeRegistry(registry)
    console.log(`[Arkzen Registry] ✓ Removed from registry: ${tatemononName}`)
  }
}

// v5: get registry entry to build full remove payload
export function getRegistryEntry(tatemononName: string): ArkzenRegistryEntry | undefined {
  return getRegistry().modules.find(m => m.name === tatemononName)
}

export function setRegistryError(tatemononName: string, error: string): void {
  const registry = getRegistry()
  const entry = registry.modules.find(m => m.name === tatemononName)
  if (entry) {
    entry.status = 'error'
    writeRegistry(registry)
  }
}

export function isRegistered(tatemononName: string): boolean {
  return getRegistry().modules.some(m => m.name === tatemononName)
}

export function getActiveModules(): ArkzenRegistryEntry[] {
  return getRegistry().modules.filter(m => m.status === 'active')
}

export function listRegistry(): void {
  const registry = getRegistry()
  console.log(`\n[Arkzen Registry] Project: ${registry.project} | Engine: ${registry.engine}`)
  console.log(`[Arkzen Registry] Active tatemonos: ${registry.modules.length}`)
  registry.modules.forEach(m => {
    const icon = m.status === 'active' ? '✓' : m.status === 'error' ? '✗' : '○'
    const pages = m.pages?.join(', ') ?? ''
    console.log(`  ${icon} ${m.name} v${m.version} — ${m.status} [${pages}]`)
  })
}
