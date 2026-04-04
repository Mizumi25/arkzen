#!/usr/bin/env node

// ============================================================
// ARKZEN ENGINE — EXPORT SCRIPT v5
// Exports a single tatemono as a standalone project
// Supports v5 multi-page, multi-component, multi-api format
// Usage: node export.js <tatemono-name>
// Example: node export.js notes
//          node export.js portfolio
//          node export.js inventory-management
// ============================================================

const { execSync } = require('child_process')
const fs   = require('fs')
const path = require('path')

const ROOT_DIR      = __dirname
const ENGINE_DIR    = path.join(ROOT_DIR, 'engine')
const FRONTEND_DIR  = path.join(ENGINE_DIR, 'frontend')
const BACKEND_DIR   = path.join(ENGINE_DIR, 'backend')
const TATEMONOS_DIR = path.join(ROOT_DIR, 'tatemonos')
const PROJECTS_DIR  = path.join(ROOT_DIR, 'projects')

function log(msg)     { console.log(`\n  ✦ ${msg}`) }
function success(msg) { console.log(`  ✓ ${msg}`) }
function warn(msg)    { console.log(`  ⚠ ${msg}`) }
function fail(msg)    { console.log(`  ✗ ${msg}`) }
function divider()    { console.log('\n' + '─'.repeat(50)) }

// ─────────────────────────────────────────────
// VALIDATE INPUT
// ─────────────────────────────────────────────

const tatName = process.argv[2]
if (!tatName) {
  console.log('\n  Usage: node export.js <tatemono-name>')
  console.log('  Example: node export.js notes')
  console.log('  Example: node export.js portfolio')
  console.log('\n  Available tatemonos:')
  if (fs.existsSync(TATEMONOS_DIR)) {
    fs.readdirSync(TATEMONOS_DIR).forEach(f => {
      const corePath = path.join(TATEMONOS_DIR, f, 'core.tsx')
      if (fs.existsSync(corePath)) console.log(`    - ${f}`)
    })
  }
  console.log('')
  process.exit(1)
}

const tatPath = path.join(TATEMONOS_DIR, tatName, 'core.tsx')
if (!fs.existsSync(tatPath)) {
  console.log(`\n  ✗ Tatemono not found: tatemonos/${tatName}/core.tsx\n`)
  process.exit(1)
}

const PROJECT_DIR = path.join(PROJECTS_DIR, tatName)
const PROJ_FRONT  = path.join(PROJECT_DIR, 'frontend')
const PROJ_BACK   = path.join(PROJECT_DIR, 'backend')

divider()
console.log(`\n  ARKZEN — Exporting tatemono: ${tatName}\n`)
divider()

// ─────────────────────────────────────────────
// PARSER HELPERS
// ─────────────────────────────────────────────

// Detects whether the tatemono uses v5 format (identifiers on sections)
// v5: /* @arkzen:components:shared */ or /* @arkzen:page:index */
// v4: /* @arkzen:components ... */ (no identifier, inline content comment)
function detectVersion(content) {
  // v5 uses end markers like /* @arkzen:components:shared:end */
  if (/\/\* @arkzen:\w+:\w+:end \*\//.test(content)) return 5
  // v5 also uses /* @arkzen:page:name */ on its own line
  if (/\/\* @arkzen:page:\w[\w-]* \*\//.test(content)) return 5
  return 4
}

// ── v4 extractor (original logic, untouched) ──────────────────────────────
function extractSectionV4(content, marker) {
  const start = content.indexOf(`/* @arkzen:${marker}`)
  if (start === -1) return null
  const openEnd = content.indexOf('*/', start)
  if (openEnd === -1) return null
  const endMarker = `/* @arkzen:${marker}:end */`
  const end = content.indexOf(endMarker)
  if (end === -1) return content.slice(start + `/* @arkzen:${marker}`.length, openEnd).trim()
  return content.slice(openEnd + 2, end).trim()
}

// ── v5 extractor ─────────────────────────────────────────────────────────
// Handles two block styles used in v5:
//
//   COMMENT BLOCK (meta, config, database:*, api:*):
//     /* @arkzen:api:inventories
//     model: Inventory
//     ...
//     */
//
//   CODE BLOCK (components:*, page:*, animation):
//     /* @arkzen:components:shared */
//     <tsx code>
//     /* @arkzen:components:shared:end */
//
// Returns all blocks for a given base marker as [{ id, content }]
function extractAllV5(content, marker) {
  const results = []

  // Regex matches BOTH styles:
  //   comment-block open: /* @arkzen:marker:id\n   (no closing */ on same token)
  //   code-block open:    /* @arkzen:marker:id */  (self-closing on same line)
  const openRe = new RegExp(`\\/\\* @arkzen:${marker}:(([\\w][\\w-]*))([^*]|\\*(?!\\/))*\\*\\/`, 'g')

  // Simpler approach: scan manually to handle both styles reliably
  let pos = 0
  while (pos < content.length) {
    // Find next occurrence of the marker prefix
    const searchStr = `/* @arkzen:${marker}:`
    const start = content.indexOf(searchStr, pos)
    if (start === -1) break

    // Extract the identifier — everything after the last colon until whitespace or */
    const afterPrefix = content.slice(start + searchStr.length)
    const idMatch = afterPrefix.match(/^([\w][\w-]*)/)
    if (!idMatch) { pos = start + 1; continue }
    const id = idMatch[1]

    // Skip layout pseudo-markers inside page blocks: /* @arkzen:page:layout:auth */
    if (marker === 'page' && id === 'layout') { pos = start + 1; continue }

    // Find the closing */ of the opening tag
    const openCloseIdx = content.indexOf('*/', start)
    if (openCloseIdx === -1) { pos = start + 1; continue }
    const afterOpenTag = openCloseIdx + 2 // position right after */

    // Determine block style:
    //   CODE BLOCK: the opening tag ends on the same line as /* and has nothing
    //               between the id and */  e.g. /* @arkzen:components:shared */
    //   COMMENT BLOCK: there's content between /* ... */ (the whole block IS the comment)
    const openTagText = content.slice(start, afterOpenTag)
    const isCodeBlock = /\/\* @arkzen:[\w:/-]+ \*\//.test(openTagText)

    let blockContent
    if (isCodeBlock) {
      // Content is AFTER the opening tag, ends at /* @arkzen:marker:id:end */
      const endMarker = `/* @arkzen:${marker}:${id}:end */`
      const endIdx    = content.indexOf(endMarker, afterOpenTag)
      const blockEnd  = endIdx === -1 ? content.length : endIdx
      blockContent    = content.slice(afterOpenTag, blockEnd).trim()
      pos = endIdx === -1 ? content.length : endIdx + endMarker.length
    } else {
      // Content IS the comment body — between /* and */
      // Strip the opening marker line itself, keep the rest
      const commentBody = content.slice(start + searchStr.length + id.length, openCloseIdx).trim()
      blockContent = commentBody
      pos = afterOpenTag
    }

    results.push({ id, content: blockContent })
  }

  return results
}

// Extract a single section (meta, animation, config) — same in v4 and v5
// v5 uses /* @arkzen:animation */ ... /* @arkzen:animation:end */
function extractSingle(content, marker) {
  const openTag  = `/* @arkzen:${marker}`
  const start    = content.indexOf(openTag)
  if (start === -1) return null
  const openEnd  = content.indexOf('*/', start)
  if (openEnd === -1) return null
  const endMarker = `/* @arkzen:${marker}:end */`
  const end       = content.indexOf(endMarker)
  if (end === -1) return content.slice(openEnd + 2).trim() // no end tag → rest of file (v4 compat)
  return content.slice(openEnd + 2, end).trim()
}

function parseMeta(raw) {
  const result = {}
  if (!raw) return result
  raw.split('\n').forEach(line => {
    const idx = line.indexOf(':')
    if (idx > -1) {
      result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
    }
  })
  return result
}

// v5: parse model/controller from ALL @arkzen:api:* blocks, return array
function parseAllApis(content, version) {
  if (version === 4) {
    // v4 has one @arkzen:api block
    const raw = extractSectionV4(content, 'api')
    if (!raw) return []
    const result = {}
    raw.split('\n').forEach(line => {
      const idx = line.indexOf(':')
      if (idx > -1) {
        const k = line.slice(0, idx).trim()
        if (['model', 'controller', 'prefix'].includes(k)) {
          result[k] = line.slice(idx + 1).trim()
        }
      }
    })
    return result.model ? [result] : []
  }

  // v5: extract all @arkzen:api:identifier blocks
  const blocks = extractAllV5(content, 'api')
  return blocks.map(({ id, content: raw }) => {
    const result = { _id: id }
    raw.split('\n').forEach(line => {
      const idx = line.indexOf(':')
      if (idx > -1) {
        const k = line.slice(0, idx).trim()
        if (['model', 'controller', 'prefix', 'middleware'].includes(k)) {
          result[k] = line.slice(idx + 1).trim()
        }
      }
    })
    return result
  }).filter(r => r.model && r.controller)
}

function toPascal(str) {
  return str.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')
}

function toCamel(str) {
  const p = toPascal(str)
  return p[0].toLowerCase() + p.slice(1)
}

// Detect the layout declared inside a page block
// /* @arkzen:page:layout:auth */ or /* @arkzen:page:layout:guest */
function extractPageLayout(pageContent) {
  const m = pageContent.match(/\/\* @arkzen:page:layout:([\w-]+) \*\//)
  return m ? m[1] : 'auth' // default to auth if not declared
}

// Strip the layout pseudo-marker from page content so it doesn't end up in .tsx
function stripLayoutMarker(pageContent) {
  return pageContent.replace(/\/\* @arkzen:page:layout:[\w-]+ \*\/\s*/g, '').trim()
}

// ─────────────────────────────────────────────
// MIGRATION GENERATOR
// Mirrors engine/backend/app/Arkzen/Builders/MigrationBuilder.php
// Used as fallback when no engine migration file exists
// ─────────────────────────────────────────────

function parseDatabase(raw) {
  const result = { table: '', timestamps: true, softDeletes: false, columns: {}, indexes: [] }
  if (!raw) return result

  const lines = raw.split('\n')
  let mode     = 'root'
  let lastCol  = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const indent = line.search(/\S/)

    if (indent === 0) {
      if (trimmed.startsWith('table:'))       { result.table       = trimmed.slice(6).trim(); continue }
      if (trimmed.startsWith('timestamps:'))  { result.timestamps  = trimmed.slice(11).trim() !== 'false'; continue }
      if (trimmed.startsWith('softDeletes:')) { result.softDeletes = trimmed.slice(12).trim() === 'true'; continue }
      if (trimmed === 'columns:')             { mode = 'columns'; continue }
      if (trimmed === 'indexes:')             { mode = 'indexes'; continue }
      if (trimmed === 'seeder:')              { mode = 'seeder';  continue }
    }

    if (mode === 'columns') {
      if (indent === 2 && !trimmed.startsWith('-')) {
        lastCol = trimmed.replace(':', '').trim()
        result.columns[lastCol] = {}
        continue
      }
      if (indent === 4 && lastCol) {
        const idx = trimmed.indexOf(':')
        if (idx > -1) {
          const k = trimmed.slice(0, idx).trim()
          const v = trimmed.slice(idx + 1).trim()
          result.columns[lastCol][k] = v === 'true' ? true : v === 'false' ? false : isNaN(v) ? v : Number(v)
        }
      }
    }

    if (mode === 'indexes') {
      if (trimmed.startsWith('- columns:')) {
        const cols = trimmed.replace('- columns:', '').trim().replace(/[\[\]]/g, '').split(',').map(s => s.trim())
        result.indexes.push({ columns: cols, unique: false })
      }
      if (trimmed.startsWith('unique:') && result.indexes.length > 0) {
        result.indexes[result.indexes.length - 1].unique = trimmed.slice(7).trim() === 'true'
      }
    }
  }

  return result
}

function generateMigrationFromDatabase(dbRaw, tatSnake) {
  const db        = parseDatabase(dbRaw)
  const tableName = db.table || tatSnake
  const className = tableName.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join('')

  const typeMap = {
    integer: 'integer', bigInteger: 'bigInteger', string: 'string',
    text: 'text', longText: 'longText', decimal: 'decimal', float: 'float',
    boolean: 'boolean', date: 'date', datetime: 'dateTime',
    timestamp: 'timestamp', json: 'json', uuid: 'uuid',
  }

  const colLines = []
  for (const [name, cfg] of Object.entries(db.columns)) {
    const type   = cfg.type || 'string'
    const method = typeMap[type] || 'string'

    if (cfg.primary && cfg.autoIncrement) { colLines.push(`            $table->id();`); continue }
    if (type === 'uuid' && cfg.primary)   { colLines.push(`            $table->uuid('${name}')->primary();`); continue }

    if (cfg.foreign) {
      const [refTable] = cfg.foreign.split('.')
      const onDelete   = cfg.onDelete || 'cascade'
      const nullable   = cfg.nullable ? '->nullable()' : ''
      colLines.push(`            $table->foreignId('${name}')${nullable}->constrained('${refTable}')->onDelete('${onDelete}');`)
      continue
    }

    let call = `$table->${method}('${name}'`
    if (method === 'string' && cfg.length)    call += `, ${cfg.length}`
    if (method === 'decimal') {
      const p = cfg.precision || 8
      const s = cfg.scale     || 2
      call = `$table->decimal('${name}', ${p}, ${s}`
    }
    call += ')'
    if (cfg.nullable) call += '->nullable()'
    if (cfg.unique)   call += '->unique()'
    if (cfg.default !== undefined) {
      const def = typeof cfg.default === 'string' ? `'${cfg.default}'` : cfg.default
      call += `->default(${def})`
    }
    if (cfg.unsigned) call += '->unsigned()'
    colLines.push(`            ${call};`)
  }

  const indexLines = db.indexes.map(idx => {
    const cols   = `['${idx.columns.join("', '")}']`
    const method = idx.unique ? 'unique' : 'index'
    return `            $table->${method}(${cols});`
  })

  const timestamps  = db.timestamps  ? `\n            $table->timestamps();`  : ''
  const softDeletes = db.softDeletes ? `\n            $table->softDeletes();` : ''
  const allCols     = [...colLines, ...(indexLines.length ? [''] : []), ...indexLines].join('\n')

  return `<?php

// ============================================================
// ARKZEN GENERATED MIGRATION — ${tableName}
// Generated by export.js from @arkzen:database section
// ============================================================

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('${tableName}', function (Blueprint $table) {
${allCols}${timestamps}${softDeletes}
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('${tableName}');
    }
};
`
}

// ─────────────────────────────────────────────
// READ TATEMONO
// ─────────────────────────────────────────────

const content = fs.readFileSync(tatPath, 'utf-8')
const version = detectVersion(content)

console.log(`  Format:   v${version}`)

const meta     = parseMeta(extractSingle(content, 'meta'))
const apis     = parseAllApis(content, version)
const pascal   = toPascal(tatName)
const camel    = toCamel(tatName)
const isStatic = apis.length === 0

// Layout is global in v4 (from meta), per-page in v5
const globalLayout = version === 4 ? (meta.layout || 'base') : null

// Animation — same in both versions
const animation  = extractSingle(content, 'animation')
const animFnName = camel + 'Animations'

console.log(`  Tatemono: ${tatName}`)
console.log(`  Type:     ${isStatic ? 'Static (frontend only)' : `Full stack — ${apis.map(a => `${a.model}/${a.controller}`).join(', ')}`}`)

// ─────────────────────────────────────────────
// SETUP PROJECT DIRECTORY
// ─────────────────────────────────────────────

if (fs.existsSync(PROJECT_DIR)) {
  log('Overwriting existing export...')
  fs.rmSync(PROJECT_DIR, { recursive: true, force: true })
}
fs.mkdirSync(PROJECT_DIR, { recursive: true })

// ─────────────────────────────────────────────
// COPY FRONTEND BASE
// ─────────────────────────────────────────────

log('Copying frontend base...')
fs.cpSync(FRONTEND_DIR, PROJ_FRONT, {
  recursive: true,
  filter: (src) => {
    if (src.includes('node_modules')) return false
    if (src.includes('.next')) return false
    if (src.includes('/tatemono/')) return false
    if (src.includes('/arkzen/generated/')) return false
    if (src.includes('arkzen.json')) return false
    if (path.basename(src) === 'arkzen.ts') return false
    if (src.includes('/arkzen/core/watcher')) return false
    if (src.includes('/arkzen/core/builder')) return false
    if (src.includes('/arkzen/core/parser')) return false
    if (src.includes('/arkzen/core/registry')) return false
    if (src.includes('/arkzen/core/backend-bridge')) return false
    const rel = path.relative(FRONTEND_DIR, src)
    if (rel.startsWith('app') && !['app', 'app/layout.tsx', 'app/page.tsx'].includes(rel) && !rel.startsWith('app/api')) return false
    return true
  }
})
log('Copying node_modules...')
fs.cpSync(path.join(FRONTEND_DIR, 'node_modules'), path.join(PROJ_FRONT, 'node_modules'), { recursive: true })
success('Frontend base ready')

// ─────────────────────────────────────────────
// GENERATE FRONTEND FILES
// ─────────────────────────────────────────────

log('Generating frontend files...')

// animations/name.ts — same for v4 and v5
if (animation) {
  const animDir = path.join(PROJ_FRONT, 'animations')
  fs.mkdirSync(animDir, { recursive: true })
  const cleanAnim = animation
    .replace(/import.*from ['"]gsap[^'"]*['"][;]?\n?/g, '')
    .replace(/import React.*['"][;]?\n?/g, '')
    .replace(/gsap\.registerPlugin\([^)]*\)[;]?\n?/g, '')
    .replace(`const ${animFnName}`, `export const ${animFnName}`)
    .trim()
  fs.writeFileSync(path.join(animDir, `${tatName}.ts`), [
    `import { gsap } from 'gsap'`,
    `import { ScrollTrigger } from 'gsap/ScrollTrigger'`,
    `import React from 'react'`,
    `gsap.registerPlugin(ScrollTrigger)`,
    ``,
    cleanAnim,
  ].join('\n'))
  success(`animations/${tatName}.ts`)
}

const animImport = animation
  ? `import { ${animFnName}, pageVariants } from '@/animations/${tatName}'`
  : ''

// ─────────────────────────────────────────────
// V4 EXPORT — single components + single page
// (original behavior, preserved exactly)
// ─────────────────────────────────────────────

if (version === 4) {
  const components    = extractSectionV4(content, 'components')
  const page          = extractSectionV4(content, 'page')
  const layoutComp    = globalLayout === 'auth' ? 'AuthLayout' : globalLayout === 'blank' ? 'BlankLayout' : 'BaseLayout'
  const componentName = pascal + 'Page'

  const pageDir = path.join(PROJ_FRONT, 'app', tatName)
  fs.mkdirSync(pageDir, { recursive: true })

  // _components.tsx
  const exportedPage = (page || '').trim().replace(`const ${componentName}`, `export const ${componentName}`)
  fs.writeFileSync(path.join(pageDir, '_components.tsx'), [
    `'use client'`,
    `// ${pascal} Components — generated from tatemono: ${tatName}`,
    ``,
    components ? components.replace(/'use client'[;]?\n?/, '').trim() : '',
    ``,
    `// ─── Page ──────────────────────────────────────────────────`,
    exportedPage,
  ].join('\n'))
  success(`app/${tatName}/_components.tsx`)

  // page.tsx
  fs.writeFileSync(path.join(pageDir, 'page.tsx'), [
    `'use client'`,
    `// ${pascal} Page wrapper — generated from tatemono: ${tatName}`,
    `import React, { useRef, useEffect } from 'react'`,
    `import { motion } from 'framer-motion'`,
    `import { ${layoutComp} } from '@/arkzen/core/layouts/${layoutComp}'`,
    animImport,
    `import { ${componentName} } from './_components'`,
    ``,
    `const ArkzenPage_${pascal} = () => {`,
    `  const pageRef = useRef<HTMLDivElement>(null)`,
    `  useEffect(() => {`,
    `    if (!pageRef.current) return`,
    animation ? `    const cleanup = ${animFnName}(pageRef); return cleanup` : `    // No animations`,
    `  }, [])`,
    `  return (`,
    `    <${layoutComp} auth={${meta.auth === 'true' ? 'true' : 'false'}}>`,
    `      <motion.div ref={pageRef} variants={{}} initial="initial" animate="animate" exit="exit">`,
    `        <${componentName} />`,
    `      </motion.div>`,
    `    </${layoutComp}>`,
    `  )`,
    `}`,
    `export default ArkzenPage_${pascal}`,
  ].join('\n'))
  success(`app/${tatName}/page.tsx`)

  // Root redirect
  fs.writeFileSync(path.join(PROJ_FRONT, 'app', 'page.tsx'), [
    `'use client'`,
    `// Root page — delegates to tatemono: ${tatName}`,
    `export { default } from './${tatName}/page'`,
  ].join('\n'))
  success(`app/page.tsx → ${tatName}`)
}

// ─────────────────────────────────────────────
// V5 EXPORT — multi-page, multi-component
// ─────────────────────────────────────────────

if (version === 5) {
  // Collect all component blocks — concatenate in order
  const componentBlocks = extractAllV5(content, 'components')

  // Build one combined _components.tsx for the shared tatemono folder
  // Each block is included as-is (stripped of 'use client' duplicates)
  const combinedComponents = componentBlocks
    .map(({ id, content: raw }) => {
      const stripped = raw.replace(/'use client'[;]?\n?/g, '').trim()
      return `// ─── ${id} ──────────────────────────────────────────────────\n${stripped}`
    })
    .join('\n\n')

  // Collect all page blocks
  const pageBlocks = extractAllV5(content, 'page')

  if (pageBlocks.length === 0) {
    fail('No @arkzen:page blocks found — at least one is required')
    process.exit(1)
  }

  // First page = root redirect target
  const firstPage = pageBlocks[0]

  // Generate one folder per page under app/tatemono-name/page-name/
  // Exception: if there's only ONE page, also put it at app/tatemono-name/ directly
  // (matches engine dev routing)
  const singlePage = pageBlocks.length === 1

  for (const { id: pageId, content: pageRaw } of pageBlocks) {
    const pageLayout    = extractPageLayout(pageRaw)
    const pageBody      = stripLayoutMarker(pageRaw)
    const layoutComp    = pageLayout === 'guest' ? 'GuestLayout' : pageLayout === 'blank' ? 'BlankLayout' : 'BaseLayout'
    const componentName = toPascal(pageId) + 'Page'

    // Route dir: app/tatemono-name/ for single-page OR app/tatemono-name/page-id/ for multi
    const routeSegment = singlePage ? tatName : `${tatName}/${pageId}`
    const pageDir      = path.join(PROJ_FRONT, 'app', routeSegment)
    fs.mkdirSync(pageDir, { recursive: true })

    // _components.tsx — all shared components + this page's component
    const exportedBody = pageBody.trim().replace(
      new RegExp(`(^|\\n)const ${componentName}`),
      `$1export const ${componentName}`
    )

    fs.writeFileSync(path.join(pageDir, '_components.tsx'), [
      `'use client'`,
      `// ${pascal} — ${pageId} — generated from tatemono: ${tatName}`,
      ``,
      combinedComponents,
      ``,
      `// ─── Page: ${pageId} ──────────────────────────────────────────────────`,
      exportedBody,
    ].join('\n'))
    success(`app/${routeSegment}/_components.tsx`)

    // page.tsx — clean layout wrapper
    fs.writeFileSync(path.join(pageDir, 'page.tsx'), [
      `'use client'`,
      `// ${toPascal(pageId)} Page wrapper — generated from tatemono: ${tatName}`,
      `import React, { useRef, useEffect } from 'react'`,
      `import { motion } from 'framer-motion'`,
      `import { ${layoutComp} } from '@/arkzen/core/layouts/${layoutComp}'`,
      animImport,
      `import { ${componentName} } from './_components'`,
      ``,
      `const ArkzenPage_${toPascal(pageId)} = () => {`,
      `  const pageRef = useRef<HTMLDivElement>(null)`,
      `  useEffect(() => {`,
      `    if (!pageRef.current) return`,
      animation ? `    const cleanup = ${animFnName}(pageRef); return cleanup` : `    // No animations`,
      `  }, [])`,
      `  return (`,
      `    <${layoutComp} auth={${meta.auth === 'true' ? 'true' : 'false'}}>`,
      `      <motion.div ref={pageRef} variants={${animation ? 'pageVariants' : '{}'}} initial="initial" animate="animate" exit="exit">`,
      `        <${componentName} />`,
      `      </motion.div>`,
      `    </${layoutComp}>`,
      `  )`,
      `}`,
      `export default ArkzenPage_${toPascal(pageId)}`,
    ].join('\n'))
    success(`app/${routeSegment}/page.tsx`)
  }

  // Root app/page.tsx — redirect to first page
  const firstRouteSegment = singlePage ? tatName : `${tatName}/${firstPage.id}`
  fs.writeFileSync(path.join(PROJ_FRONT, 'app', 'page.tsx'), [
    `'use client'`,
    `// Root page — delegates to tatemono: ${tatName} → ${firstPage.id}`,
    `export { default } from './${firstRouteSegment}/page'`,
  ].join('\n'))
  success(`app/page.tsx → ${firstRouteSegment}`)
}

// ─────────────────────────────────────────────
// BACKEND (skip entirely if static)
// ─────────────────────────────────────────────

if (!isStatic) {
  log('Copying backend base...')
  fs.cpSync(BACKEND_DIR, PROJ_BACK, {
    recursive: true,
    filter: (src) => {
      if (src.includes('/vendor/')) return false
      if (src.includes('database.sqlite')) return false
      if (src.includes('/database/arkzen/')) return false      // isolated SQLite files
      if (src.includes('/app/Arkzen/')) return false
      if (src.includes('ArkzenEngineController')) return false
      if (src.includes('ArkzenEngineMiddleware')) return false
      if (src.includes('/app/Providers/Arkzen/')) return false
      if (src.includes('/routes/arkzen.php')) return false
      if (src.includes('/routes/modules/')) return false
      if (src.includes('/migrations/arkzen/')) return false
      if (src.includes('/database/seeders/')) return false
      if (src.includes('/Models/Arkzen/')) return false
      if (src.includes('/Controllers/Arkzen/')) return false
      if (src.includes('/Requests/Arkzen/')) return false
      if (src.includes('/Policies/Arkzen/')) return false
      if (src.includes('/Resources/Arkzen/')) return false
      if (src.includes('/factories/Arkzen/')) return false
      return true
    }
  })
  log('Copying vendor...')
  fs.cpSync(path.join(BACKEND_DIR, 'vendor'), path.join(PROJ_BACK, 'vendor'), { recursive: true })
  success('Backend base ready')

  // Base Controller.php
  fs.mkdirSync(path.join(PROJ_BACK, 'app', 'Http', 'Controllers'), { recursive: true })
  fs.writeFileSync(path.join(PROJ_BACK, 'app', 'Http', 'Controllers', 'Controller.php'), `<?php

namespace App\\Http\\Controllers;

abstract class Controller
{
    //
}
`)
  success('app/Http/Controllers/Controller.php')

  // ── Process each API resource ─────────────────────────────────────────
  const allSeeders     = []
  const routeIncludes  = []
  const tatSnake       = tatName.replace(/-/g, '_')
  // v5.1: all engine files now live under slug subfolders
  const engMigDir      = path.join(BACKEND_DIR, 'database', 'migrations', 'arkzen', tatName)
  const engSeederDir   = path.join(BACKEND_DIR, 'database', 'seeders', 'arkzen', tatName)
  const engModulesDir  = path.join(BACKEND_DIR, 'routes', 'modules')
  const engArkzenDbDir = path.join(BACKEND_DIR, 'database', 'arkzen')

  for (const api of apis) {
    const { model: modelName, controller: ctrlName, _id: apiId } = api

    // ── Model ─────────────────────────────────────────────────────
    // Engine: Models/Arkzen/{tatName}/{modelName}.php
    // Export: Models/{modelName}.php  (flat, stripped namespace + connection + table prefix)
    const engModelPath = path.join(BACKEND_DIR, 'app', 'Models', 'Arkzen', tatName, `${modelName}.php`)
    if (fs.existsSync(engModelPath)) {
      fs.mkdirSync(path.join(PROJ_BACK, 'app', 'Models'), { recursive: true })
      let m = fs.readFileSync(engModelPath, 'utf-8')
        .replace(`namespace App\\Models\\Arkzen\\${tatName};`, 'namespace App\\Models;')
        .replace(/\n    protected \$connection = '[^']+';/, '')
        .replace(new RegExp(`'${tatSnake}_([a-z_]+)'`, 'g'), "'$1'")
        .replace(new RegExp(`\\\\App\\\\Models\\\\Arkzen\\\\${tatName}\\\\`, 'g'), '\\\\App\\\\Models\\\\')
      fs.writeFileSync(path.join(PROJ_BACK, 'app', 'Models', `${modelName}.php`), m)
      success(`app/Models/${modelName}.php`)
    } else {
      fail(`Models/Arkzen/${tatName}/${modelName}.php NOT FOUND — run engine first`)
    }

    // ── Controller ──────────────────────────────────────────────
    // Engine: Controllers/Arkzen/{tatName}/{ctrlName}.php
    // Export: Controllers/{ctrlName}.php
    const engCtrlPath = path.join(BACKEND_DIR, 'app', 'Http', 'Controllers', 'Arkzen', tatName, `${ctrlName}.php`)
    if (fs.existsSync(engCtrlPath)) {
      let c = fs.readFileSync(engCtrlPath, 'utf-8')
        .replace('namespace App\\Http\\Controllers\\Arkzen;', 'namespace App\\Http\\Controllers;')
        .replace(`use App\\Models\\Arkzen\\${tatName}\\${modelName};`, `use App\\Models\\${modelName};`)
      fs.writeFileSync(path.join(PROJ_BACK, 'app', 'Http', 'Controllers', `${ctrlName}.php`), c)
      success(`app/Http/Controllers/${ctrlName}.php`)
    } else {
      fail(`Controllers/Arkzen/${tatName}/${ctrlName}.php NOT FOUND — run engine first`)
    }

    // ── Migration ───────────────────────────────────────────────
    // Engine: migrations/arkzen/{tatName}/*.php  (with connection + prefixed table)
    // Export: migrations/*.php  (connection removed, table prefix stripped)
    const modelSnake = modelName.toLowerCase()
    let migCopied    = false

    if (fs.existsSync(engMigDir)) {
      const migFiles  = fs.readdirSync(engMigDir).filter(f => f.endsWith('.php'))
      const createMig = migFiles.find(f =>
        f.includes('_create_') && (f.includes(tatSnake) || f.includes(apiId) || f.includes(modelSnake))
      )
      if (createMig) {
        let migContent = fs.readFileSync(path.join(engMigDir, createMig), 'utf-8')
          .replace(/\n    protected \$connection = '[^']+';/, '')
          .replace(/Schema::connection\('[^']+'\)->create\(/g, 'Schema::create(')
          .replace(/Schema::connection\('[^']+'\)->table\(/g, 'Schema::table(')
          .replace(/Schema::connection\('[^']+'\)->dropIfExists\(/g, 'Schema::dropIfExists(')
          .replace(new RegExp(`'${tatSnake}_([a-z_]+)'`, 'g'), "'$1'")
        const cleanMigName = createMig.replace(`_${tatSnake}_`, '_')
        fs.writeFileSync(path.join(PROJ_BACK, 'database', 'migrations', cleanMigName), migContent)
        success(`database/migrations/${cleanMigName}`)
        migCopied = true
      }
    }

    if (!migCopied) {
      let dbRaw = null
      if (version === 5) {
        const dbBlocks = extractAllV5(content, 'database')
        const matched  = dbBlocks.find(b => b.id === apiId || b.id === modelSnake)
        dbRaw = matched ? matched.content : (dbBlocks[0] ? dbBlocks[0].content : null)
      } else {
        dbRaw = extractSectionV4(content, 'database')
      }
      if (dbRaw) {
        const generatedMig = generateMigrationFromDatabase(dbRaw, tatSnake)
        const timestamp    = new Date().toISOString().replace(/[-T:\.Z]/g, '').slice(0, 14)
        const migFileName  = `${timestamp}_create_${apiId || tatSnake}_table.php`
        fs.writeFileSync(path.join(PROJ_BACK, 'database', 'migrations', migFileName), generatedMig)
        success(`database/migrations/${migFileName} (generated from tatemono)`)
      } else {
        fail(`No migration found for ${modelName}`)
      }
    }

    // ── Routes ──────────────────────────────────────────────────────
    const routeFileName = tatName
    const routeFileById = apiId.replace(/_/g, '-')
    let routeFound      = false

    for (const candidate of [routeFileName, routeFileById]) {
      const engRoutePath = path.join(engModulesDir, `${candidate}.php`)
      if (fs.existsSync(engRoutePath)) {
        let r = fs.readFileSync(engRoutePath, 'utf-8')
          .replace(new RegExp(`App\\\\Http\\\\Controllers\\\\Arkzen\\\\${tatName}\\\\`, 'g'), 'App\\\\Http\\\\Controllers\\\\')
          .replace(/App\\Http\\Controllers\\Arkzen\\\\/g, 'App\\Http\\Controllers\\')
        const destName = apis.length === 1 ? tatName : `${tatName}-${apiId}`
        fs.writeFileSync(path.join(PROJ_BACK, 'routes', `${destName}.php`), r)
        routeIncludes.push(destName)
        success(`routes/${destName}.php`)
        routeFound = true
        break
      }
    }
    if (!routeFound) {
      fail(`routes/modules/${tatName}.php NOT FOUND — run engine first`)
    }

    // ── Seeders ─────────────────────────────────────────────────────
    // Engine: seeders/arkzen/{tatName}/*.php  (with connection + prefixed table)
    // Export: seeders/*.php  (flat, stripped)
    if (fs.existsSync(engSeederDir)) {
      const seederFiles = fs.readdirSync(engSeederDir).filter(f =>
        f.toLowerCase().includes(modelName.toLowerCase())
      )
      if (seederFiles.length > 0) {
        fs.mkdirSync(path.join(PROJ_BACK, 'database', 'seeders'), { recursive: true })
        seederFiles.forEach(sf => {
          let s = fs.readFileSync(path.join(engSeederDir, sf), 'utf-8')
            .replace(`namespace Database\\Seeders\\Arkzen\\${tatName};`, 'namespace Database\\Seeders;')
            .replace(new RegExp(`DB::connection\\('${tatSnake}'\\)->`, 'g'), 'DB::')
            .replace(new RegExp(`'${tatSnake}_([a-z_]+)'`, 'g'), "'$1'")
          const match = s.match(/class\s+(\w+)\s+extends/)
          if (match) allSeeders.push(match[1])
          fs.writeFileSync(path.join(PROJ_BACK, 'database', 'seeders', sf), s)
          success(`database/seeders/${sf}`)
        })
      }
    }
  }

  // ── Copy isolated SQLite → exported default DB ───────────────────────
  // Engine uses database/arkzen/{tatName}.sqlite, export uses database/database.sqlite
  const engSqlitePath = path.join(engArkzenDbDir, `${tatName}.sqlite`)
  if (fs.existsSync(engSqlitePath) && fs.statSync(engSqlitePath).size > 0) {
    fs.copyFileSync(engSqlitePath, path.join(PROJ_BACK, 'database', 'database.sqlite'))
    success(`database/database.sqlite (copied from engine isolated DB)`)
  }
  // api.php — include all route files
  const apiPhpLines = ['<?php']
  const uniqueIncludes = [...new Set(routeIncludes)]
  if (uniqueIncludes.length > 0) {
    uniqueIncludes.forEach(r => apiPhpLines.push(`require __DIR__.'/${r}.php';`))
  } else {
    // Fallback: include tatName.php
    apiPhpLines.push(`require __DIR__.'/${tatName}.php';`)
  }
  fs.writeFileSync(path.join(PROJ_BACK, 'routes', 'api.php'), apiPhpLines.join('\n'))
  success('routes/api.php')

  // DatabaseSeeder.php
  fs.mkdirSync(path.join(PROJ_BACK, 'database', 'seeders'), { recursive: true })
  const seederCalls = allSeeders.map(s => `        $this->call(${s}::class);`).join('\n')
  fs.writeFileSync(path.join(PROJ_BACK, 'database', 'seeders', 'DatabaseSeeder.php'), `<?php

namespace Database\\Seeders;

use Illuminate\\Database\\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
${seederCalls}
    }
}
`)
  success('database/seeders/DatabaseSeeder.php')

  // Configure backend
  log('Configuring backend...')

  const dbPath = path.join(PROJ_BACK, 'database', 'database.sqlite')
  // SQLite already copied from engine isolated DB above (or will be created empty by migrations)

  const envEx = path.join(PROJ_BACK, '.env.example')
  if (fs.existsSync(envEx)) {
    let env = fs.readFileSync(envEx, 'utf-8')
    env = env
      .replace(/APP_NAME=.*/, `APP_NAME=${tatName}`)
      .replace(/APP_ENV=.*/, 'APP_ENV=local')
      .replace(/APP_DEBUG=.*/, 'APP_DEBUG=true')
      .replace(/DB_CONNECTION=.*/, 'DB_CONNECTION=sqlite')
      .replace(/DB_HOST=.*/, '# DB_HOST=')
      .replace(/DB_PORT=.*/, '# DB_PORT=')
      .replace(/DB_DATABASE=.*/, `DB_DATABASE=${dbPath}`)
      .replace(/DB_USERNAME=.*/, '# DB_USERNAME=')
      .replace(/DB_PASSWORD=.*/, '# DB_PASSWORD=')
    fs.writeFileSync(path.join(PROJ_BACK, '.env'), env)
  }

  const appPhpContent = [
    '<?php',
    '',
    'use Illuminate\\Foundation\\Application;',
    'use Illuminate\\Foundation\\Configuration\\Exceptions;',
    'use Illuminate\\Foundation\\Configuration\\Middleware;',
    'use Illuminate\\Support\\Facades\\Route;',
    '',
    'return Application::configure(basePath: dirname(__DIR__))',
    '    ->withRouting(',
    "        web: __DIR__.'/../routes/web.php',",
    "        commands: __DIR__.'/../routes/console.php',",
    "        health: '/up',",
    '        then: function () {',
    "            $routesPath = base_path('routes');",
    "            $skip = ['web.php', 'console.php', 'api.php'];",
    "            foreach (glob($routesPath . '/*.php') as $routeFile) {",
    '                if (!in_array(basename($routeFile), $skip)) {',
    "                    Route::middleware('api')->group($routeFile);",
    '                }',
    '            }',
    '        },',
    '    )',
    '    ->withMiddleware(function (Middleware $middleware): void {',
    '        //',
    '    })',
    '    ->withExceptions(function (Exceptions $exceptions): void {',
    '        //',
    '    })->create();',
    '',
  ].join('\n')
  fs.writeFileSync(path.join(PROJ_BACK, 'bootstrap', 'app.php'), appPhpContent)
  success('bootstrap/app.php')

  const provPath = path.join(PROJ_BACK, 'bootstrap', 'providers.php')
  if (fs.existsSync(provPath)) {
    let prov = fs.readFileSync(provPath, 'utf-8')
    prov = prov.replace(/\s*App\\Providers\\Arkzen\\ArkzenServiceProvider::class,?\n?/, '\n')
    fs.writeFileSync(provPath, prov)
  }

  ;[
    path.join(PROJ_BACK, 'app', 'Arkzen'),
    path.join(PROJ_BACK, 'app', 'Http', 'Controllers', 'Arkzen'),
    path.join(PROJ_BACK, 'app', 'Models', 'Arkzen'),
    path.join(PROJ_BACK, 'app', 'Providers', 'Arkzen'),
  ].forEach(dir => {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
  })
  success('Engine folders cleaned')

  log('Generating app key...')
  try { execSync('php artisan key:generate --force', { cwd: PROJ_BACK, stdio: 'pipe' }); success('App key generated') }
  catch { warn('App key will generate on first run') }

  log('Running migrations...')
  try { execSync('php artisan migrate --force', { cwd: PROJ_BACK, stdio: 'pipe' }); success('Migrations complete') }
  catch { warn('Migrations failed — check log on first start') }

  log('Running seeders...')
  try { execSync('php artisan db:seed --force', { cwd: PROJ_BACK, stdio: 'pipe' }); success('Seeders complete') }
  catch { warn('No seeders to run') }

} else {
  log('Static tatemono — no backend needed')
  success('Frontend only export')
}

// ─────────────────────────────────────────────
// CONFIGURE FRONTEND
// ─────────────────────────────────────────────

log('Configuring frontend...')

fs.writeFileSync(path.join(PROJ_FRONT, 'next.config.js'), isStatic
  ? `/** @type {import('next').NextConfig} */
const nextConfig = { experimental: { forceSwcTransforms: false } }
module.exports = nextConfig
`
  : `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { forceSwcTransforms: false },
  async rewrites() {
    return [{ source: '/api/:path*', destination: 'http://127.0.0.1:8001/api/:path*' }]
  },
}
module.exports = nextConfig
`)

const pkgPath = path.join(PROJ_FRONT, 'package.json')
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  pkg.name = tatName
  pkg.scripts = {
    dev:   'NEXT_IGNORE_INCORRECT_LOCKFILE=1 NEXT_DISABLE_SWC=1 next dev --webpack --port 3001',
    build: 'next build',
    start: 'next start --port 3001',
  }
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
}
success('Frontend configured')

// ─────────────────────────────────────────────
// START SCRIPT
// ─────────────────────────────────────────────

if (isStatic) {
  fs.writeFileSync(path.join(PROJECT_DIR, 'start.js'), [
    `const { spawn } = require('child_process')`,
    `const path = require('path')`,
    `const FRONT = path.join(__dirname, 'frontend')`,
    `console.log('\\n  Starting ${tatName}...')`,
    `console.log('  URL: http://localhost:3001\\n')`,
    `const frontend = spawn('npm', ['run', 'dev'], { cwd: FRONT, stdio: 'inherit' })`,
    `process.on('SIGINT', () => { frontend.kill(); process.exit(0) })`,
  ].join('\n'))
} else {
  fs.writeFileSync(path.join(PROJECT_DIR, 'start.js'), [
    `const { spawn } = require('child_process')`,
    `const path = require('path')`,
    `const FRONT = path.join(__dirname, 'frontend')`,
    `const BACK  = path.join(__dirname, 'backend')`,
    `console.log('\\n  Starting ${tatName}...')`,
    `console.log('  Frontend: http://localhost:3001')`,
    `console.log('  Backend:  http://localhost:8001\\n')`,
    `const backend  = spawn('php', ['artisan', 'serve', '--port=8001'], { cwd: BACK, stdio: 'inherit' })`,
    `const frontend = spawn('npm', ['run', 'dev'], { cwd: FRONT, stdio: 'inherit' })`,
    `process.on('SIGINT', () => { backend.kill(); frontend.kill(); process.exit(0) })`,
  ].join('\n'))
}

fs.writeFileSync(path.join(PROJECT_DIR, '.gitignore'), [
  '**/node_modules/', '**/vendor/', '**/.next/',
  '**/.env', '**/database/database.sqlite',
  '**/.env.local', '*.log', '.DS_Store',
].join('\n'))

// ─────────────────────────────────────────────
// DONE
// ─────────────────────────────────────────────

divider()
console.log(`\n  ✓ EXPORTED: ${tatName}`)
console.log(`  Format: v${version}`)
console.log(`  Type:   ${isStatic ? 'Static (frontend only)' : 'Full stack (frontend + backend)'}`)
console.log(`  Run:    cd projects/${tatName} && node start.js`)
console.log(`  Deploy: push projects/${tatName} to GitHub`)
divider()