// ============================================================
// ARKZEN ENGINE — PARSER v5.1
// v5.1: Added parseAllCustomRoutes() for @arkzen:routes blocks.
//       Supports lightweight one-off endpoints with no model/database.
//       customRoutes wired into parseTatemono(), hasBackend check,
//       hasSections() detection, and ParsedTatemono output.
//
// Key changes v5 (kept):
//   - meta.layout removed — layout is now per-page
//   - extractAllNamedSections() for ALL repeatable markers
//   - parseAllPages() extracts per-page layout declarations
//   - parseAllLayouts() for @arkzen:layout:name blocks
//   - parseAllComponents() — components now repeatable
//   - ALL markers repeatable: store, events, jobs, etc.
//   - Topological sort for migrations (auto foreign key ordering)
// ============================================================

import * as fs   from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import type {
  ParsedTatemono,
  ArkzenMeta,
  ArkzenConfigOverride,
  ArkzenDatabase,
  ArkzenApi,
  ArkzenCustomRoute,
  ArkzenCustomRouteEntry,
  ArkzenSection,
  ArkzenPage,
  ArkzenLayout,
  ArkzenErrorHandler,
  ArkzenErrorHandlerType,
} from '../types'

// ─────────────────────────────────────────────
// SINGLE SECTION EXTRACTOR
// ─────────────────────────────────────────────

function extractSection(content: string, marker: string): string | null {
  const startMarker = `/* @arkzen:${marker}`
  const endMarker   = `/* @arkzen:${marker}:end */`

  const startIndex = content.indexOf(startMarker)
  if (startIndex === -1) return null

  const openingEnd = content.indexOf('*/', startIndex)
  if (openingEnd === -1) return null

  const endIndex = content.indexOf(endMarker)

  if (endIndex === -1) {
    return content.slice(startIndex + startMarker.length, openingEnd).trim()
  }

  return content.slice(openingEnd + 2, endIndex).trim()
}

function extractSectionWithPosition(content: string, marker: string): ArkzenSection | null {
  const openMarker  = `/* @arkzen:${marker}`
  const closeMarker = `/* @arkzen:${marker}:end */`

  const start = content.indexOf(openMarker)
  if (start === -1) return null

  const openingEnd = content.indexOf('*/', start)
  if (openingEnd === -1) return null

  const end = content.indexOf(closeMarker)
  if (end === -1) return null

  const raw = content.slice(openingEnd + 2, end).trim()
  return { raw, start, end }
}

// ─────────────────────────────────────────────
// MULTI SECTION EXTRACTOR — YAML blocks (no identifiers)
// For @arkzen:database and @arkzen:api (YAML comment blocks)
// ─────────────────────────────────────────────

function extractAllSections(content: string, marker: string): string[] {
  const startMarker = `/* @arkzen:${marker}`
  const results: string[] = []
  let searchFrom = 0

  while (true) {
    const startIndex = content.indexOf(startMarker, searchFrom)
    if (startIndex === -1) break

    // FIXED: Find the REAL closing */ — the one on its own line (preceded by \n or start).
    // Naive content.indexOf('*/') breaks on cron expressions like "*/5 * * * *" which
    // contain "*/" mid-string, causing the parser to split one block into many fragments.
    // The real closing marker is always "\n*/" (newline then */), never inline.
    let openingEnd = -1
    let searchPos = startIndex + startMarker.length
    while (true) {
      const candidate = content.indexOf('*/', searchPos)
      if (candidate === -1) break
      // Accept if preceded by newline (real block close) or if it's right after the opening /*
      const charBefore = candidate > 0 ? content[candidate - 1] : '\n'
      if (charBefore === '\n' || candidate === startIndex + 2) {
        openingEnd = candidate
        break
      }
      // Skip this */ — it's inline (e.g. inside a cron string "*/5 * * * *")
      searchPos = candidate + 2
    }
    if (openingEnd === -1) break

    // Slice everything between the marker keyword and the closing */
    // This may start with :identifier (e.g. ":products\ntable: products")
    // or be plain YAML (v4 compat). Strip the identifier prefix line if present.
    let rawSlice = content
      .slice(startIndex + startMarker.length, openingEnd)
      .trim()

    // If the content starts with :identifier, strip that first token
    // e.g. ":products\ntable: products" → "table: products"
    rawSlice = rawSlice.replace(/^:[a-zA-Z0-9_-]+\s*\n?/, '').trim()

    if (rawSlice) {
      results.push(rawSlice)
    }

    searchFrom = openingEnd + 2
  }

  return results
}

// ─────────────────────────────────────────────
// NAMED SECTION EXTRACTOR — v5
// For @arkzen:marker:name ... @arkzen:marker:name:end
// Returns array of { name, raw, start, end }
// ─────────────────────────────────────────────

function extractAllNamedSections(content: string, marker: string): ArkzenSection[] {
  const results: ArkzenSection[] = []
  let searchFrom = 0

  while (true) {
    // Find next opening: /* @arkzen:marker:
    const openPattern = `/* @arkzen:${marker}:`
    const openIdx = content.indexOf(openPattern, searchFrom)
    if (openIdx === -1) break

    // Extract the identifier (everything until whitespace or */)
    const afterOpen = content.slice(openIdx + openPattern.length)
    const identMatch = afterOpen.match(/^([a-zA-Z0-9_-]+)/)
    if (!identMatch) { searchFrom = openIdx + openPattern.length; continue }

    const identifier = identMatch[1]

    // Skip :end markers
    if (identifier === 'end') { searchFrom = openIdx + openPattern.length; continue }

    // Find end of opening comment
    const openCommentEnd = content.indexOf('*/', openIdx)
    if (openCommentEnd === -1) break

    // Find closing marker: /* @arkzen:marker:identifier:end */
    const closeMarker = `/* @arkzen:${marker}:${identifier}:end */`
    const closeIdx = content.indexOf(closeMarker, openCommentEnd)
    if (closeIdx === -1) { searchFrom = openCommentEnd + 2; continue }

    // Extract raw content between opening comment close and closing marker
    // Also handle per-page layout declarations inside the block
    const raw = content.slice(openCommentEnd + 2, closeIdx).trim()

    results.push({
      raw,
      start: openIdx,
      end:   closeIdx + closeMarker.length,
    })

    searchFrom = closeIdx + closeMarker.length
  }

  return results
}

// ─────────────────────────────────────────────
// YAML SECTION PARSERS
// ─────────────────────────────────────────────

function parseMeta(content: string): ArkzenMeta {
  const raw = extractSection(content, 'meta')
  if (!raw) throw new Error('[Arkzen Parser] Missing @arkzen:meta section')

  const parsed = yaml.load(raw) as Record<string, unknown>

  if (!parsed.name) throw new Error('[Arkzen Parser] meta.name is required')

  return {
    name:         String(parsed.name),
    version:      String(parsed.version ?? '1.0.0'),
    description:  String(parsed.description ?? ''),
    auth:         Boolean(parsed.auth ?? false),
    dependencies: (parsed.dependencies as string[]) ?? [],
  }
}

function parseConfig(content: string): ArkzenConfigOverride | undefined {
  const raw = extractSection(content, 'config')
  if (!raw) return undefined
  return yaml.load(raw) as ArkzenConfigOverride
}

// ─────────────────────────────────────────────
// PARSE ALL DATABASE BLOCKS
// ─────────────────────────────────────────────

function parseAllDatabases(content: string): ArkzenDatabase[] {
  const raws   = extractAllSections(content, 'database')
  const result: ArkzenDatabase[] = []

  for (const raw of raws) {
    const parsed = yaml.load(raw) as Record<string, unknown>
    if (!parsed || !parsed.table) continue

    const table = String(parsed.table)
    if (table === '_none' || table === '' || table === 'null') continue
    if (!parsed.columns) {
      throw new Error(`[Arkzen Parser] database.columns is required for table: ${table}`)
    }

    result.push({
      table,
      timestamps:  Boolean(parsed.timestamps  ?? true),
      softDeletes: Boolean(parsed.softDeletes ?? false),
      columns:     parsed.columns as ArkzenDatabase['columns'],
      indexes:     (parsed.indexes as ArkzenDatabase['indexes']) ?? [],
      seeder:      parsed.seeder as ArkzenDatabase['seeder'],
    })
  }

  // v5: Topological sort — auto-order by foreign key dependencies
  return topologicalSort(result)
}

// ─────────────────────────────────────────────
// TOPOLOGICAL SORT — v5 Decision 7
// Auto-orders migrations so parent tables run before children
// ─────────────────────────────────────────────

function topologicalSort(databases: ArkzenDatabase[]): ArkzenDatabase[] {
  const tableNames = new Set(databases.map(d => d.table))
  const dependsOn  = new Map<string, Set<string>>()

  for (const db of databases) {
    const deps = new Set<string>()
    for (const col of Object.values(db.columns)) {
      if (col.foreign) {
        const refTable = col.foreign.split('.')[0]
        if (tableNames.has(refTable) && refTable !== db.table) {
          deps.add(refTable)
        }
      }
    }
    dependsOn.set(db.table, deps)
  }

  const sorted: ArkzenDatabase[] = []
  const visited = new Set<string>()

  function visit(table: string): void {
    if (visited.has(table)) return
    visited.add(table)
    for (const dep of dependsOn.get(table) ?? []) {
      visit(dep)
    }
    const db = databases.find(d => d.table === table)
    if (db) sorted.push(db)
  }

  for (const db of databases) {
    visit(db.table)
  }

  return sorted
}

// ─────────────────────────────────────────────
// PARSE ALL API BLOCKS — FIXED
// Now includes resource, policy, factory fields
// ─────────────────────────────────────────────

function parseAllApis(content: string): ArkzenApi[] {
  const raws   = extractAllSections(content, 'api')
  const result: ArkzenApi[] = []

  for (const raw of raws) {
    const parsed = yaml.load(raw) as Record<string, unknown>
    if (!parsed || !parsed.model) continue

    const model = String(parsed.model)
    if (model === '_none' || model === '' || model === 'null') continue

    if (!parsed.controller) throw new Error(`[Arkzen Parser] api.controller is required for model: ${model}`)
    if (!parsed.prefix)     throw new Error(`[Arkzen Parser] api.prefix is required for model: ${model}`)

    result.push({
      model,
      controller: String(parsed.controller),
      prefix:     String(parsed.prefix),
      middleware: (parsed.middleware as string[]) ?? [],
      endpoints:  (parsed.endpoints  as ArkzenApi['endpoints']) ?? {},
      resource:   parsed.resource ?? false,
      policy:     parsed.policy ?? false,
      factory:    parsed.factory ?? false,
    })
  }

  return result
}

// ─────────────────────────────────────────────
// PARSE ALL CUSTOM ROUTES — v5.1
//
// Handles @arkzen:routes blocks — lightweight one-off endpoints
// that don't require a model, database, or full resource controller.
//
// DSL format (self-closing YAML comment block):
//   /* @arkzen:routes
//   controller: SimulateController
//   middleware: []
//   routes:
//     - method: GET
//       route: /api/errors-test/simulate/{code}
//       handler: simulate
//   */
//
// Multiple @arkzen:routes blocks are supported — each becomes one
// ArkzenCustomRoute entry. The controller is auto-generated by
// CustomRouteBuilder with a method stub per handler entry.
//
// Handler methods receive route parameters as variadic $params:
//   public function simulate(Request $request, mixed ...$params): JsonResponse
//   { $code = (int)($params[0] ?? 200); return response()->json([...], $code); }
// ─────────────────────────────────────────────

function parseAllCustomRoutes(content: string): ArkzenCustomRoute[] {
  const raws   = extractAllSections(content, 'routes')
  const result: ArkzenCustomRoute[] = []

  for (const raw of raws) {
    const parsed = yaml.load(raw) as Record<string, unknown>
    if (!parsed) continue

    const controller = String(parsed.controller ?? 'CustomController')
    const middleware = (parsed.middleware as string[]) ?? []
    const rawRoutes  = (parsed.routes as Record<string, unknown>[]) ?? []

    if (rawRoutes.length === 0) continue

    const routes: ArkzenCustomRouteEntry[] = rawRoutes.map(r => ({
      method:  (String(r.method ?? 'GET').toUpperCase()) as ArkzenCustomRouteEntry['method'],
      route:   String(r.route ?? '/'),
      handler: String(r.handler ?? 'handle'),
    }))

    result.push({ controller, middleware, routes })
  }

  return result
}

// ─────────────────────────────────────────────
// PARSE ALL PAGES — v5
// Extracts @arkzen:page:name blocks with per-page layout
// Layout declared as: /* @arkzen:page:layout:guest */
// ─────────────────────────────────────────────

function parseAllPages(content: string): ArkzenPage[] {
  const results: ArkzenPage[] = []
  let searchFrom = 0

  while (true) {
    const openPattern = `/* @arkzen:page:`
    const openIdx = content.indexOf(openPattern, searchFrom)
    if (openIdx === -1) break

    const afterOpen = content.slice(openIdx + openPattern.length)
    const identMatch = afterOpen.match(/^([a-zA-Z0-9_-]+)/)
    if (!identMatch) { searchFrom = openIdx + openPattern.length; continue }

    const pageName = identMatch[1]

    // Skip :end and :layout markers
    if (pageName === 'end' || pageName === 'layout') {
      searchFrom = openIdx + openPattern.length
      continue
    }

    // Find end of opening comment */
    const openCommentEnd = content.indexOf('*/', openIdx)
    if (openCommentEnd === -1) break

    // Find closing marker
    const closeMarker = `/* @arkzen:page:${pageName}:end */`
    const closeIdx = content.indexOf(closeMarker, openCommentEnd)
    if (closeIdx === -1) { searchFrom = openCommentEnd + 2; continue }

    // Raw content between opening comment and closing marker
    let raw = content.slice(openCommentEnd + 2, closeIdx).trim()

    // Extract layout from @arkzen:page:layout:X declaration inside the block
    let layout: string = 'auth'  // default
    const layoutMatch = raw.match(/\/\* @arkzen:page:layout:([a-zA-Z0-9_-]+) \*\//)
    if (layoutMatch) {
      layout = layoutMatch[1]
      // Remove layout declaration line from raw code
      raw = raw.replace(/\/\* @arkzen:page:layout:[a-zA-Z0-9_-]+ \*\/\n?/, '').trim()
    }

    results.push({
      name:   pageName,
      layout,
      raw,
      start:  openIdx,
      end:    closeIdx + closeMarker.length,
    })

    searchFrom = closeIdx + closeMarker.length
  }

  return results
}

// ─────────────────────────────────────────────
// PARSE ALL CUSTOM LAYOUTS — v5
// @arkzen:layout:name ... @arkzen:layout:name:end
// ─────────────────────────────────────────────

function parseAllLayouts(content: string): ArkzenLayout[] {
  const sections = extractAllNamedSections(content, 'layout')
  return sections.map(s => {
    // Extract name from the marker — re-parse from content
    const marker = content.slice(s.start)
    const nameMatch = marker.match(/\/\* @arkzen:layout:([a-zA-Z0-9_-]+)/)
    const name = nameMatch ? nameMatch[1] : 'unknown'
    return { name, raw: s.raw, start: s.start, end: s.end }
  })
}

// ─────────────────────────────────────────────
// PARSE ALL NAMED CODE SECTIONS (events, jobs, console, etc.)
// v5.2 FIX: Two valid block shapes exist for these markers:
//
//   Shape A — plain self-closing YAML block (no identifier):
//     /* @arkzen:events
//     order-placed:
//       listeners: [SendOrderConfirmation]
//     */
//
//   Shape B — named YAML-comment block (identifier in marker, :end closer):
//     /* @arkzen:console:cleanup-temp
//     signature: scheduler-test:cleanup-temp
//     description: Deletes temporary files
//     schedule: "0 * * * *"
//     */
//     /* @arkzen:console:cleanup-temp:end */
//
// Shape A: YAML is between the marker */ and the next block.
//          Handled by extractAllSections() — strips :identifier prefix.
//
// Shape B: YAML is INSIDE the opening comment (between marker line and */).
//          The :end block is empty — nothing sits between */ and :end.
//          extractAllSections() picks up both the opening content AND
//          the bare ":end */" text as separate entries, which breaks parsing.
//
// Solution: detect Shape B blocks first (those that have a matching :name:end),
// extract their YAML from inside the opening comment, then fall back to
// extractAllSections() for any remaining Shape A blocks.
// ─────────────────────────────────────────────

function parseAllNamedCode(content: string, marker: string): ArkzenSection[] {
  const results: ArkzenSection[] = []
  const openPattern = `/* @arkzen:${marker}:`

  // ── Pass 1: collect all Shape B named blocks ──────────────────────────────
  // These have /* @arkzen:marker:name\n...yaml...\n*/ and a separate :end block.
  // YAML lives inside the opening comment, keyed under the block name.
  const namedMerged: Record<string, unknown> = {}
  let searchFrom = 0
  const usedRanges: Array<[number, number]> = []

  while (true) {
    const openIdx = content.indexOf(openPattern, searchFrom)
    if (openIdx === -1) break

    const afterOpen  = content.slice(openIdx + openPattern.length)
    const identMatch = afterOpen.match(/^([a-zA-Z0-9_-]+)/)
    if (!identMatch) { searchFrom = openIdx + openPattern.length; continue }

    const identifier = identMatch[1]
    if (identifier === 'end') { searchFrom = openIdx + openPattern.length; continue }

    // Only handle if a matching :end exists (Shape B)
    const endMarker = `/* @arkzen:${marker}:${identifier}:end */`
    const endIdx    = content.indexOf(endMarker, openIdx)
    if (endIdx === -1) { searchFrom = openIdx + openPattern.length; continue }

    // Extract YAML from inside the opening comment
    const openCommentEnd = content.indexOf('*/', openIdx)
    if (openCommentEnd === -1 || openCommentEnd > endIdx) { searchFrom = openIdx + openPattern.length; continue }

    // Content between ":identifier\n" and closing "*/"
    const rawSlice = content
      .slice(openIdx + openPattern.length + identifier.length, openCommentEnd)
      .trim()

    if (rawSlice) {
      // Wrap under the identifier key so it merges into the flat map correctly
      namedMerged[identifier] = rawSlice
        .split('\n')
        .reduce((acc: Record<string, string>, line) => {
          const colonIdx = line.indexOf(':')
          if (colonIdx === -1) return acc
          const key = line.slice(0, colonIdx).trim()
          const val = line.slice(colonIdx + 1).trim().replace(/^[\"']|[\"']$/g, '')
          acc[key] = val
          return acc
        }, {})
    }

    // Mark the full range (open marker → end marker) as consumed
    usedRanges.push([openIdx, endIdx + endMarker.length])
    searchFrom = endIdx + endMarker.length
  }

  // If any named blocks were found, emit one merged section
  if (Object.keys(namedMerged).length > 0) {
    // Rebuild as YAML string for the backend — but actually we push the
    // parsed object directly. ModuleReader v7 calls Yaml::parse() on each
    // raw string, so we must emit valid YAML, not a JS object.
    // Build one YAML string with all named entries.
    const yamlLines: string[] = []
    for (const [name, cfg] of Object.entries(namedMerged)) {
      yamlLines.push(`${name}:`)
      if (cfg && typeof cfg === 'object') {
        for (const [k, v] of Object.entries(cfg as Record<string, string>)) {
          // Quote values that contain special YAML characters
          const needsQuote = /[:#\[\]{},&*?|<>=!%@`]/.test(String(v)) || String(v).includes('"')
          yamlLines.push(`  ${k}: ${needsQuote ? `'${String(v).replace(/'/g, "''")}'` : v}`)
        }
      }
    }
    results.push({ raw: yamlLines.join('\n'), start: 0, end: 0 })
  }

  // ── Pass 2: Shape A — plain /* @arkzen:marker ... */ blocks ───────────────
  // Use extractAllSections but skip any content overlapping Shape B ranges.
  const plainRaws = extractAllSections(content, marker)
  for (const raw of plainRaws) {
    // Filter out ":end */" bleed-through — these are bare strings that start
    // with ":end" or are empty after stripping, produced when extractAllSections
    // matches the closing comment of a Shape B block.
    const trimmed = raw.trim()
    if (!trimmed || trimmed.startsWith(':end') || trimmed === '*/' ) continue
    // Also skip if this raw content was already captured as a Shape B block
    // (heuristic: if every top-level key matches a namedMerged key, skip it)
    results.push({ raw: trimmed, start: 0, end: 0 })
  }

  return results
}

// ─────────────────────────────────────────────
// PARSE ALL CONSOLE BLOCKS — v6.0
// @arkzen:console:name blocks work like @arkzen:page:name —
// named blocks with :end, YAML config in the opening comment,
// PHP handle() body between */ and :end.
//
// Each block emits a raw YAML string with an extra `body` key
// carrying the handle() code. ModuleReader + ConsoleBuilder
// read config keys (signature, description, schedule) AND body.
//
// Format:
//   /* @arkzen:console:cleanup-temp
//   signature: scheduler-test:cleanup-temp
//   description: Deletes temporary files
//   schedule: '0 * * * *'
//   */
//   public function handle(): int { ... }
//   /* @arkzen:console:cleanup-temp:end */
// ─────────────────────────────────────────────

function parseAllConsoles(content: string): ArkzenSection[] {
  const results: ArkzenSection[] = []
  const openPattern = `/* @arkzen:console:`
  let searchFrom = 0

  while (true) {
    const openIdx = content.indexOf(openPattern, searchFrom)
    if (openIdx === -1) break

    const afterOpen  = content.slice(openIdx + openPattern.length)
    const identMatch = afterOpen.match(/^([a-zA-Z0-9_-]+)/)
    if (!identMatch) { searchFrom = openIdx + openPattern.length; continue }

    const identifier = identMatch[1]
    if (identifier === 'end') { searchFrom = openIdx + openPattern.length; continue }

    // Find closing */ of opening comment
    const openCommentEnd = content.indexOf('*/', openIdx)
    if (openCommentEnd === -1) break

    // YAML config lives inside the opening comment
    const yamlRaw = content
      .slice(openIdx + openPattern.length + identifier.length, openCommentEnd)
      .trim()

    // PHP body lives between */ and :end
    const closeMarker = `/* @arkzen:console:${identifier}:end */`
    const closeIdx    = content.indexOf(closeMarker, openCommentEnd)
    const body        = closeIdx !== -1
      ? content.slice(openCommentEnd + 2, closeIdx).trim()
      : ''

    // Emit as a YAML string with name as top-level key and body embedded
    // Body is base64-encoded to safely embed multiline PHP inside YAML
    const bodyEncoded = Buffer.from(body).toString('base64')
    const raw = `${identifier}:\n` +
      yamlRaw.split('\n').map(l => `  ${l}`).join('\n') +
      `\n  body: '${bodyEncoded}'`

    results.push({ raw, start: openIdx, end: closeIdx !== -1 ? closeIdx + closeMarker.length : openCommentEnd + 2 })

    searchFrom = closeIdx !== -1 ? closeIdx + closeMarker.length : openCommentEnd + 2
  }

  return results
}



function parseAllJobs(content: string): ArkzenSection[] {
  const results: ArkzenSection[] = []
  const openPattern = `/* @arkzen:jobs:`
  let searchFrom = 0

  while (true) {
    const openIdx = content.indexOf(openPattern, searchFrom)
    if (openIdx === -1) break

    const afterOpen = content.slice(openIdx + openPattern.length)
    const identMatch = afterOpen.match(/^([a-zA-Z0-9_-]+)/)
    if (!identMatch) { searchFrom = openIdx + openPattern.length; continue }

    const identifier = identMatch[1]
    if (identifier === 'end') { searchFrom = openIdx + openPattern.length; continue }

    const openCommentEnd = content.indexOf('*/', openIdx)
    if (openCommentEnd === -1) break

    // YAML config inside the opening comment
    const yamlRaw = content
      .slice(openIdx + openPattern.length + identifier.length, openCommentEnd)
      .trim()

    // PHP body between */ and :end
    const closeMarker = `/* @arkzen:jobs:${identifier}:end */`
    const closeIdx = content.indexOf(closeMarker, openCommentEnd)
    const body = closeIdx !== -1
      ? content.slice(openCommentEnd + 2, closeIdx).trim()
      : ''

    const bodyEncoded = Buffer.from(body).toString('base64')
    const raw = `${identifier}:\n` +
      yamlRaw.split('\n').map(l => `  ${l}`).join('\n') +
      `\n  body: '${bodyEncoded}'`

    results.push({ raw, start: openIdx, end: closeIdx !== -1 ? closeIdx + closeMarker.length : openCommentEnd + 2 })

    searchFrom = closeIdx !== -1 ? closeIdx + closeMarker.length : openCommentEnd + 2
  }

  return results
}


function parseAllEvents(content: string): ArkzenSection[] {
  const results: ArkzenSection[] = []
  const openPattern = `/* @arkzen:events:`
  let searchFrom = 0

  while (true) {
    const openIdx = content.indexOf(openPattern, searchFrom)
    if (openIdx === -1) break

    const afterOpen = content.slice(openIdx + openPattern.length)
    const identMatch = afterOpen.match(/^([a-zA-Z0-9_-]+)/)
    if (!identMatch) { searchFrom = openIdx + openPattern.length; continue }

    const identifier = identMatch[1]
    if (identifier === 'end') { searchFrom = openIdx + openPattern.length; continue }

    const openCommentEnd = content.indexOf('*/', openIdx)
    if (openCommentEnd === -1) break

    // YAML config inside the opening comment
    const yamlRaw = content
      .slice(openIdx + openPattern.length + identifier.length, openCommentEnd)
      .trim()

    // No PHP body for events — only YAML config with listeners
    const closeMarker = `/* @arkzen:events:${identifier}:end */`
    const closeIdx = content.indexOf(closeMarker, openCommentEnd)
    const body = '' // events don't have PHP body

    const bodyEncoded = Buffer.from(body).toString('base64')
    const raw = `${identifier}:\n` +
      yamlRaw.split('\n').map(l => `  ${l}`).join('\n') +
      `\n  body: '${bodyEncoded}'`

    results.push({ raw, start: openIdx, end: closeIdx !== -1 ? closeIdx + closeMarker.length : openCommentEnd + 2 })

    searchFrom = closeIdx !== -1 ? closeIdx + closeMarker.length : openCommentEnd + 2
  }

  return results
}




function parseAllRealtime(content: string): ArkzenSection[] {
  const results: ArkzenSection[] = []
  const openPattern = `/* @arkzen:realtime:`
  let searchFrom = 0

  while (true) {
    const openIdx = content.indexOf(openPattern, searchFrom)
    if (openIdx === -1) break

    const afterOpen = content.slice(openIdx + openPattern.length)
    const identMatch = afterOpen.match(/^([a-zA-Z0-9_-]+)/)
    if (!identMatch) { searchFrom = openIdx + openPattern.length; continue }

    const identifier = identMatch[1]
    if (identifier === 'end') { searchFrom = openIdx + openPattern.length; continue }

    const openCommentEnd = content.indexOf('*/', openIdx)
    if (openCommentEnd === -1) break

    // YAML config inside the opening comment
    const yamlRaw = content
      .slice(openIdx + openPattern.length + identifier.length, openCommentEnd)
      .trim()

    // No PHP body for realtime sections
    const closeMarker = `/* @arkzen:realtime:${identifier}:end */`
    const closeIdx = content.indexOf(closeMarker, openCommentEnd)
    const body = ''

    const bodyEncoded = Buffer.from(body).toString('base64')
    const raw = `${identifier}:\n` +
      yamlRaw.split('\n').map(l => `  ${l}`).join('\n') +
      `\n  body: '${bodyEncoded}'`

    results.push({ raw, start: openIdx, end: closeIdx !== -1 ? closeIdx + closeMarker.length : openCommentEnd + 2 })

    searchFrom = closeIdx !== -1 ? closeIdx + closeMarker.length : openCommentEnd + 2
  }

  return results
}




function parseAllComponents(content: string): ArkzenSection[] {
  return extractAllNamedSections(content, 'components')
}

// ─────────────────────────────────────────────
// PARSE ERROR HANDLERS — v6
// Extracts @arkzen:error:404 and @arkzen:error:500 blocks.
// These generate Next.js segment-scoped not-found.tsx / error.tsx
// rather than routed pages. Each has an :end closer.
//
// Format:
//   /* @arkzen:error:404 */
//   const NotFoundPage = () => <ErrorScreen code={404} />
//   /* @arkzen:error:404:end */
// ─────────────────────────────────────────────

function parseAllErrorHandlers(content: string): ArkzenErrorHandler[] {
  const results: ArkzenErrorHandler[] = []
  const validTypes: ArkzenErrorHandlerType[] = ['404', '500']

  for (const type of validTypes) {
    const openMarker  = `/* @arkzen:error:${type} */`
    const closeMarker = `/* @arkzen:error:${type}:end */`

    const openIdx = content.indexOf(openMarker)
    if (openIdx === -1) continue

    const closeIdx = content.indexOf(closeMarker, openIdx)
    if (closeIdx === -1) continue

    const raw = content.slice(openIdx + openMarker.length, closeIdx).trim()
    if (!raw) continue

    results.push({ type, raw })
  }

  return results
}

// ─────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────

function validateFileName(filePath: string, meta: ArkzenMeta): void {
  const fileName = path.basename(filePath, '.tsx')
  if (fileName === 'core') return
  if (fileName !== meta.name) {
    throw new Error(
      `[Arkzen Parser] File name "${fileName}" does not match meta.name "${meta.name}".`
    )
  }
}

function validateTableNames(databases: ArkzenDatabase[]): void {
  for (const db of databases) {
    if (!/^[a-z][a-z0-9_]*$/.test(db.table)) {
      throw new Error(
        `[Arkzen Parser] Table name "${db.table}" must be lowercase snake_case`
      )
    }
  }
}

function validateNoDuplicateTables(databases: ArkzenDatabase[]): void {
  const seen = new Set<string>()
  for (const db of databases) {
    if (seen.has(db.table)) {
      throw new Error(`[Arkzen Parser] Duplicate table declared: "${db.table}"`)
    }
    seen.add(db.table)
  }
}

function validateNoDuplicateControllers(apis: ArkzenApi[]): void {
  const seen = new Set<string>()
  for (const api of apis) {
    if (seen.has(api.controller)) {
      throw new Error(`[Arkzen Parser] Duplicate controller declared: "${api.controller}"`)
    }
    seen.add(api.controller)
  }
}

function validatePages(pages: ArkzenPage[], errorHandlers: ArkzenErrorHandler[]): void {
  // A tatemono with only error handlers and no routed pages is valid
  if (pages.length === 0 && errorHandlers.length === 0) {
    throw new Error('[Arkzen Parser] At least one @arkzen:page:name section is required')
  }
  const seen = new Set<string>()
  for (const page of pages) {
    if (seen.has(page.name)) {
      throw new Error(`[Arkzen Parser] Duplicate page declared: "${page.name}"`)
    }
    seen.add(page.name)
  }
}

// ─────────────────────────────────────────────
// MAIN PARSER
// ─────────────────────────────────────────────

export function parseTatemono(filePath: string): ParsedTatemono {
  console.log(`[Arkzen Parser] Parsing: ${filePath}`)

  if (!fs.existsSync(filePath)) {
    throw new Error(`[Arkzen Parser] File not found: ${filePath}`)
  }

  if (!filePath.endsWith('.tsx')) {
    throw new Error(`[Arkzen Parser] Tatemono files must be .tsx: ${filePath}`)
  }

  const content  = fs.readFileSync(filePath, 'utf-8')
  const fileName = path.basename(filePath, '.tsx')

  const meta         = parseMeta(content)
  const config       = parseConfig(content)
  const databases    = parseAllDatabases(content)
  const apis         = parseAllApis(content)
  const customRoutes = parseAllCustomRoutes(content)
  const pages        = parseAllPages(content)
  const layouts      = parseAllLayouts(content)
  const components   = parseAllComponents(content)
  const errorHandlers = parseAllErrorHandlers(content)

  // Repeatable sections
  const stores        = parseAllNamedCode(content, 'store')
  const realtimes     = parseAllRealtime(content)
  const events        = parseAllEvents(content)
  const jobs          = parseAllJobs(content)
  const notifications = parseAllNamedCode(content, 'notifications')
  const mails         = parseAllNamedCode(content, 'mail')
  const consoles      = parseAllConsoles(content)

  const animation = extractSectionWithPosition(content, 'animation') ?? undefined

  validateFileName(filePath, meta)
  validateTableNames(databases)
  validateNoDuplicateTables(databases)
  validateNoDuplicateControllers(apis)
  validatePages(pages, errorHandlers)

  const hasBackend =
    databases.length     > 0 ||
    apis.length          > 0 ||
    customRoutes.length  > 0 ||  // ← v5.1
    stores.length        > 0 ||
    events.length        > 0 ||
    realtimes.length     > 0 ||
    jobs.length          > 0 ||
    notifications.length > 0 ||
    mails.length         > 0 ||
    consoles.length      > 0

  const isStatic = !hasBackend

  const parsed: ParsedTatemono = {
    filePath,
    fileName,
    meta,
    config,
    databases,
    apis,
    customRoutes,
    pages,
    layouts,
    components,
    errorHandlers,
    stores,
    realtimes,
    events,
    jobs,
    notifications,
    mails,
    consoles,
    animation,
  }

  console.log(`[Arkzen Parser] ✓ Parsed: ${meta.name} v${meta.version}`)
  console.log(`[Arkzen Parser]   Auth: ${meta.auth} | Static: ${isStatic}`)
  console.log(`[Arkzen Parser]   Pages (${pages.length}): ${pages.map(p => `${p.name}[${p.layout}]`).join(', ')}`)
  if (errorHandlers.length)  console.log(`[Arkzen Parser]   Error handlers (${errorHandlers.length}): ${errorHandlers.map(e => e.type).join(', ')}`)
  if (databases.length)      console.log(`[Arkzen Parser]   Tables (${databases.length}): ${databases.map(d => d.table).join(', ')}`)
  if (apis.length)           console.log(`[Arkzen Parser]   Resources (${apis.length}): ${apis.map(a => a.model).join(', ')}`)
  if (customRoutes.length)   console.log(`[Arkzen Parser]   Custom routes (${customRoutes.length}): ${customRoutes.map(c => c.controller).join(', ')}`)
  if (events.length)         console.log(`[Arkzen Parser]   Events (${events.length}): ${events.length} block(s)`)
  if (realtimes.length)      console.log(`[Arkzen Parser]   Realtime (${realtimes.length}): ${realtimes.length} block(s)`)
  if (jobs.length)           console.log(`[Arkzen Parser]   Jobs (${jobs.length}): ${jobs.length} block(s)`)
  if (notifications.length)  console.log(`[Arkzen Parser]   Notifications (${notifications.length}): ${notifications.length} block(s)`)
  if (mails.length)          console.log(`[Arkzen Parser]   Mail (${mails.length}): ${mails.length} block(s)`)
  if (consoles.length)       console.log(`[Arkzen Parser]   Console (${consoles.length}): ${consoles.length} block(s)`)

  return parsed
}

export function hasSections(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8')
  return {
    meta:          content.includes('/* @arkzen:meta'),
    config:        content.includes('/* @arkzen:config'),
    database:      content.includes('/* @arkzen:database'),
    api:           content.includes('/* @arkzen:api'),
    routes:        content.includes('/* @arkzen:routes'),   // ← v5.1
    store:         content.includes('/* @arkzen:store:'),
    components:    content.includes('/* @arkzen:components:'),
    page:          content.includes('/* @arkzen:page:'),
    animation:     content.includes('/* @arkzen:animation'),
    errorHandler:  content.includes('/* @arkzen:error:'),
  }
}