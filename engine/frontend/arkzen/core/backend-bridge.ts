// ============================================================
// ARKZEN ENGINE — BACKEND BRIDGE v5.1
// ============================================================

import type { ParsedTatemono } from '../types'

const BACKEND_URL          = process.env.ARKZEN_BACKEND_URL   ?? 'http://localhost:8000'
const ARKZEN_ENGINE_SECRET = process.env.ARKZEN_ENGINE_SECRET ?? 'arkzen-engine-secret'

export async function triggerBackendBuild(tatemono: ParsedTatemono): Promise<void> {
  const hasBackend =
    tatemono.databases.length     > 0 ||
    tatemono.apis.length          > 0 ||
    tatemono.meta.auth            === true ||
    tatemono.events.length        > 0 ||
    tatemono.realtimes.length     > 0 ||
    tatemono.jobs.length          > 0 ||
    tatemono.notifications.length > 0 ||
    tatemono.mails.length         > 0 ||
    tatemono.consoles.length      > 0

  if (!hasBackend) {
    console.log(`[Arkzen Bridge] ✓ Static tatemono — skipping backend build: ${tatemono.meta.name}`)
    return
  }

  console.log(`[Arkzen Bridge] Sending to Laravel: ${tatemono.meta.name}`)
  if (tatemono.databases.length)     console.log(`[Arkzen Bridge]   Tables: ${tatemono.databases.map(d => d.table).join(', ')}`)
  if (tatemono.apis.length)          console.log(`[Arkzen Bridge]   Resources: ${tatemono.apis.map(a => a.model).join(', ')}`)
  if (tatemono.events.length)        console.log(`[Arkzen Bridge]   Events: ${tatemono.events.length} block(s)`)
  if (tatemono.realtimes.length)     console.log(`[Arkzen Bridge]   Realtime: ${tatemono.realtimes.length} block(s)`)
  if (tatemono.jobs.length)          console.log(`[Arkzen Bridge]   Jobs: ${tatemono.jobs.length} block(s)`)
  if (tatemono.notifications.length) console.log(`[Arkzen Bridge]   Notifications: ${tatemono.notifications.length} block(s)`)
  if (tatemono.mails.length)         console.log(`[Arkzen Bridge]   Mail: ${tatemono.mails.length} block(s)`)
  if (tatemono.consoles.length)      console.log(`[Arkzen Bridge]   Console: ${tatemono.consoles.length} block(s)`)

  const payload = {
    name:          tatemono.meta.name,
    version:       tatemono.meta.version,
    auth:          tatemono.meta.auth,
    databases:     tatemono.databases,
    apis:          tatemono.apis.map(api => ({
      model:      api.model,
      controller: api.controller,
      prefix:     api.prefix,
      middleware: api.middleware,
      endpoints:  api.endpoints,
      resource:   api.resource   ?? false,
      policy:     api.policy     ?? false,
      factory:    api.factory    ?? false,
    })),
    // Send raw YAML strings only — ModuleReader.parse() normalises these
    // into typed PHP arrays before any builder ever sees them.
    // ArkzenSection objects ({ raw, start, end }) must be unwrapped here;
    // PHP builders must never receive the wrapper object.
    events:        tatemono.events.map(s        => s.raw),
    realtimes:     tatemono.realtimes.map(s     => s.raw),
    jobs:          tatemono.jobs.map(s           => s.raw),
    notifications: tatemono.notifications.map(s => s.raw),
    mails:         tatemono.mails.map(s          => s.raw),
    consoles:      tatemono.consoles.map(s       => s.raw),
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

export async function triggerBackendRemove(
  tatemononName: string,
  registry?: {
    models:      string[]
    controllers: string[]
    tables:      string[]
  }
): Promise<void> {
  console.log(`[Arkzen Bridge] Removing from Laravel: ${tatemononName}`)

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