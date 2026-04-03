// ============================================================
// ARKZEN ENGINE — BACKEND BRIDGE v5.0
// Key changes:
//   - remove payload now includes models, controllers, tables
//     so Laravel can clean up ALL associated files
// ============================================================

import type { ParsedTatemono } from '../types'

const BACKEND_URL          = process.env.ARKZEN_BACKEND_URL   ?? 'http://localhost:8000'
const ARKZEN_ENGINE_SECRET = process.env.ARKZEN_ENGINE_SECRET ?? 'arkzen-engine-secret'

export async function triggerBackendBuild(tatemono: ParsedTatemono): Promise<void> {
  if (tatemono.databases.length === 0 && tatemono.apis.length === 0) {
    console.log(`[Arkzen Bridge] ✓ Static tatemono — skipping backend build: ${tatemono.meta.name}`)
    return
  }

  console.log(`[Arkzen Bridge] Sending to Laravel: ${tatemono.meta.name}`)
  console.log(`[Arkzen Bridge]   Tables: ${tatemono.databases.map(d => d.table).join(', ')}`)
  console.log(`[Arkzen Bridge]   Resources: ${tatemono.apis.map(a => a.model).join(', ')}`)

  const payload = {
    name:      tatemono.meta.name,
    version:   tatemono.meta.version,
    databases: tatemono.databases,
    apis:      tatemono.apis,
  }

  try {
    const response = await fetch(`${BACKEND_URL}/arkzen/build`, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-Arkzen-Secret': ARKZEN_ENGINE_SECRET,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Laravel backend returned ${response.status}: ${errorText}`)
    }

    const result = await response.json() as {
      success: boolean
      message: string
      steps:   string[]
      errors:  string[]
    }

    console.log(`[Arkzen Bridge] ✓ Backend build complete: ${tatemono.meta.name}`)
    result.steps?.forEach(step => console.log(`  ✓ ${step}`))
    result.errors?.forEach(err  => console.log(`  ✗ ${err}`))

  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`[Arkzen Bridge] Cannot reach Laravel at ${BACKEND_URL}. Is it running?`)
    }
    throw error
  }
}

// ─────────────────────────────────────────────
// TRIGGER REMOVE — v5
// Now sends full payload for complete cleanup:
//   models, controllers, tables
// ─────────────────────────────────────────────

export async function triggerBackendRemove(
  tatemononName: string,
  registry?: {
    models:      string[]
    controllers: string[]
    tables:      string[]
  }
): Promise<void> {
  console.log(`[Arkzen Bridge] Removing from Laravel: ${tatemononName}`)

  // v5: full payload for complete deletion
  const payload = {
    name:        tatemononName,
    models:      registry?.models      ?? [],
    controllers: registry?.controllers ?? [],
    tables:      registry?.tables      ?? [],
  }

  try {
    const response = await fetch(`${BACKEND_URL}/arkzen/remove`, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-Arkzen-Secret': ARKZEN_ENGINE_SECRET,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Laravel backend returned ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    console.log(`[Arkzen Bridge] ✓ Removal complete: ${tatemononName}`)

  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.warn(`[Arkzen Bridge] ⚠ Cannot reach Laravel. Manual cleanup may be needed.`)
      return
    }
    throw error
  }
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/arkzen/health`, {
      headers: { 'X-Arkzen-Secret': ARKZEN_ENGINE_SECRET },
    })
    return response.ok
  } catch {
    return false
  }
}
