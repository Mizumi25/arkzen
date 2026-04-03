// ============================================================
// ARKZEN ENGINE — TATEMONO VALIDATOR v5.0
// Pre-build validation. Run before engine builds.
//
// Usage: node validate.js <tatemono-name>
//   or:  import { validateTatemono } from './validator'
//
// Checks:
//   1. Structure — required sections, marker syntax
//   2. Database  — table names, types, foreign keys, no circles
//   3. API       — naming conventions, methods, prefixes
//   4. Pages     — layout declarations, no duplicates
//   5. Consistency — model/table name alignment
// ============================================================

import * as fs   from 'fs'
import * as path from 'path'
import { parseTatemono } from './parser'
import type { ParsedTatemono, ValidationResult, ArkzenDatabase } from '../types'

const VALID_COLUMN_TYPES = new Set([
  'integer', 'bigInteger', 'string', 'text', 'longText',
  'decimal', 'float', 'boolean', 'date', 'datetime',
  'timestamp', 'json', 'uuid',
])

const VALID_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])

// ─────────────────────────────────────────────
// MAIN VALIDATOR
// ─────────────────────────────────────────────

export function validateTatemono(filePath: string): ValidationResult {
  const errors:   string[] = []
  const warnings: string[] = []

  let parsed: ParsedTatemono

  // ── Parse first ──────────────────────────────
  try {
    parsed = parseTatemono(filePath)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { valid: false, errors: [msg], warnings }
  }

  // ── 1. Structure ─────────────────────────────
  if (parsed.pages.length === 0) {
    errors.push('At least one @arkzen:page:name section is required')
  }

  if (parsed.components.length === 0) {
    errors.push('At least one @arkzen:components:identifier section is required')
  }

  // ── 2. Database ───────────────────────────────
  const tableNames = new Set(parsed.databases.map(d => d.table))
  tableNames.add('users') // users is always available

  for (const db of parsed.databases) {
    // Table name format
    if (!/^[a-z][a-z0-9_]*s$/.test(db.table) && db.table !== 'users') {
      warnings.push(`Table "${db.table}" should be plural snake_case (e.g., "${db.table}s")`)
    }

    // Column types
    for (const [colName, col] of Object.entries(db.columns)) {
      if (!VALID_COLUMN_TYPES.has(col.type)) {
        errors.push(`Table "${db.table}", column "${colName}": invalid type "${col.type}"`)
      }

      // Foreign key validation
      if (col.foreign) {
        const [refTable] = col.foreign.split('.')
        if (!tableNames.has(refTable)) {
          errors.push(
            `Table "${db.table}", column "${colName}": foreign key references unknown table "${refTable}". ` +
            `Only tables within this tatemono or "users" are allowed.`
          )
        }
      }
    }
  }

  // Check for circular foreign key dependencies
  const circularErrors = detectCircularDeps(parsed.databases)
  errors.push(...circularErrors)

  // Check duplicate table names
  const seenTables = new Set<string>()
  for (const db of parsed.databases) {
    if (seenTables.has(db.table)) {
      errors.push(`Duplicate table declaration: "${db.table}"`)
    }
    seenTables.add(db.table)
  }

  // ── 3. API ────────────────────────────────────
  for (const api of parsed.apis) {
    // Controller naming
    if (!api.controller.endsWith('Controller')) {
      errors.push(`API controller "${api.controller}" must end with "Controller" (e.g., "${api.controller}Controller")`)
    }

    // Model naming
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(api.model)) {
      errors.push(`API model "${api.model}" must be PascalCase`)
    }

    // Prefix format
    if (!api.prefix.startsWith('/api/')) {
      errors.push(`API prefix "${api.prefix}" must start with /api/ (e.g., /api/${api.model.toLowerCase()}s)`)
    }

    // Endpoint methods
    for (const [epName, ep] of Object.entries(api.endpoints)) {
      if (ep.method && !VALID_METHODS.has(ep.method)) {
        errors.push(`API "${api.controller}", endpoint "${epName}": invalid method "${ep.method}"`)
      }
    }
  }

  // Duplicate controllers
  const seenControllers = new Set<string>()
  for (const api of parsed.apis) {
    if (seenControllers.has(api.controller)) {
      errors.push(`Duplicate controller: "${api.controller}"`)
    }
    seenControllers.add(api.controller)
  }

  // ── 4. Pages ──────────────────────────────────
  const validLayouts = new Set(['guest', 'auth', ...parsed.layouts.map(l => l.name)])

  for (const page of parsed.pages) {
    if (!validLayouts.has(page.layout)) {
      errors.push(
        `Page "${page.name}": layout "${page.layout}" is not defined. ` +
        `Valid layouts: ${[...validLayouts].join(', ')}. ` +
        `To define a custom layout, use @arkzen:layout:${page.layout}`
      )
    }
  }

  // Auth pages vs guest pages — warn if no guest page when auth:true
  if (parsed.meta.auth) {
    const guestPages = parsed.pages.filter(p => p.layout === 'guest')
    const authPages  = parsed.pages.filter(p => p.layout === 'auth')
    if (guestPages.length === 0 && authPages.length > 0) {
      warnings.push(
        'auth: true is set but no guest (public) pages found. ' +
        'Users will have no way to log in. Add @arkzen:page:layout:guest to a login page.'
      )
    }
  }

  // ── 5. Consistency ────────────────────────────
  for (const api of parsed.apis) {
    const expectedTable = toSnakeCase(api.model) + 's'
    const hasTable = parsed.databases.some(d => d.table === expectedTable || d.table === toSnakeCase(api.model))
    if (!hasTable && parsed.databases.length > 0) {
      warnings.push(
        `API model "${api.model}" expects table "${expectedTable}" — ` +
        `ensure a @arkzen:database block declares table: ${expectedTable}`
      )
    }
  }

  // Default role column warning
  for (const db of parsed.databases) {
    if (db.table === 'users' && db.columns['role']) {
      warnings.push(`users table uses custom "role" column — ensure your auth logic handles this`)
    }
  }

  const valid = errors.length === 0

  if (valid) {
    console.log(`\n✓ Valid tatemono: ${parsed.meta.name}`)
    console.log(`  - ${parsed.databases.length} table(s): ${parsed.databases.map(d => d.table).join(', ')}`)
    console.log(`  - ${parsed.apis.length} resource(s): ${parsed.apis.map(a => a.model).join(', ')}`)
    console.log(`  - ${parsed.pages.length} page(s): ${parsed.pages.map(p => `${p.name}[${p.layout}]`).join(', ')}`)
    if (warnings.length > 0) {
      console.log(`  - ${warnings.length} warning(s):`)
      warnings.forEach(w => console.log(`    ⚠ ${w}`))
    } else {
      console.log(`  - No warnings`)
    }
  } else {
    console.log(`\n✗ Invalid tatemono: ${parsed.meta.name}`)
    errors.forEach(e => console.log(`  ✗ ${e}`))
    if (warnings.length > 0) {
      warnings.forEach(w => console.log(`  ⚠ ${w}`))
    }
  }

  return {
    valid,
    errors,
    warnings,
    summary: valid ? {
      tables:    parsed.databases.map(d => d.table),
      pages:     parsed.pages.map(p => p.name),
      resources: parsed.apis.map(a => a.model),
    } : undefined,
  }
}

// ─────────────────────────────────────────────
// CIRCULAR DEPENDENCY DETECTION
// ─────────────────────────────────────────────

function detectCircularDeps(databases: ArkzenDatabase[]): string[] {
  const errors: string[] = []
  const deps = new Map<string, Set<string>>()

  for (const db of databases) {
    const d = new Set<string>()
    for (const col of Object.values(db.columns)) {
      if (col.foreign) d.add(col.foreign.split('.')[0])
    }
    deps.set(db.table, d)
  }

  function hasCycle(table: string, visited: Set<string>, stack: Set<string>): boolean {
    visited.add(table)
    stack.add(table)
    for (const dep of deps.get(table) ?? []) {
      if (!visited.has(dep)) {
        if (hasCycle(dep, visited, stack)) return true
      } else if (stack.has(dep)) {
        return true
      }
    }
    stack.delete(table)
    return false
  }

  const visited = new Set<string>()
  for (const db of databases) {
    if (!visited.has(db.table)) {
      if (hasCycle(db.table, visited, new Set())) {
        errors.push(`Circular foreign key dependency detected involving table "${db.table}"`)
      }
    }
  }

  return errors
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function toSnakeCase(str: string): string {
  return str.replace(/(?<!^)[A-Z]/g, '_$0').toLowerCase()
}
