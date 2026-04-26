// ============================================================
// ARKZEN ENGINE — ROUTER v5.0 (fixed)
// - Pages named "index" are placed directly in tatemono folder (app/name/page.tsx)
// - Other pages go into subfolders (app/name/dashboard/page.tsx)
// - Imports are adjusted accordingly (same folder vs parent folder)
// - Generates sitemap.xml and robots.txt for SEO
// ============================================================

import * as fs from 'fs'
import * as path from 'path'
import type { ParsedTatemono, ArkzenPage, ArkzenErrorHandler } from '../types'
import { writeSitemap } from './sitemap'
import { getRegistry } from './registry'
import { copyAssetsToPublic, cleanOldAssets } from './assets'

const APP_DIR   = path.resolve(process.cwd(), 'app')
const PAGES_DIR = path.resolve(process.cwd(), 'pages')

function detectRouterType(): 'app' | 'pages' {
  if (fs.existsSync(APP_DIR)) return 'app'
  return 'pages'
}

// ─────────────────────────────────────────────
// LAYOUT HELPERS — v5
// ─────────────────────────────────────────────

function getLayoutImport(layout: string, meta: { name: string }): string {
  switch (layout) {
    case 'guest': return `import { GuestLayout } from '@/arkzen/core/layouts/GuestLayout'`
    case 'auth':  return `import { AuthLayout }  from '@/arkzen/core/layouts/AuthLayout'`
    default:
      return `import { ${toPascalCase(layout)}Layout } from '@/arkzen/core/layouts/custom/${layout}'`
  }
}

function getLayoutComponent(layout: string): string {
  switch (layout) {
    case 'guest': return 'GuestLayout'
    case 'auth':  return 'AuthLayout'
    default:      return `${toPascalCase(layout)}Layout`
  }
}

/**
 * Extracts the React component name from raw page code.
 * Looks for "const XxxPage = " or "const XxxPage: " patterns.
 * Falls back to toSafeComponentName(pageName) if not found.
 */
function extractComponentName(pageName: string, raw: string): string {
  const match = raw.match(/const\s+([A-Za-z_$][A-Za-z0-9_$]*Page)\s*[=:(]/)
  if (match) return match[1]
  return toSafeComponentName(pageName) + 'Page'
}

// ─────────────────────────────────────────────
// GENERATE INDIVIDUAL COMPONENT FILES
// ─────────────────────────────────────────────

function generateIndividualComponentFiles(tatemono: ParsedTatemono, baseDir: string): void {
  if (tatemono.components.length === 0) return

  const componentsDir = path.join(baseDir, 'components')
  fs.mkdirSync(componentsDir, { recursive: true })

  // Write ONE _components.tsx with ALL utilities, types, helpers
  const componentsFile = path.join(componentsDir, '_components.tsx')
  const componentsContent = `'use client'
// ============================================================
// ARKZEN GENERATED SHARED UTILITIES — ${tatemono.meta.name}
// All utilities, types, constants from @arkzen:components
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: ${new Date().toISOString()}
// ============================================================

${tatemono.components.map(c => c.raw.trim()).join('\n\n')}
`
  fs.writeFileSync(componentsFile, componentsContent, 'utf-8')
  console.log(`[Arkzen Router] ✓ Utilities: _components.tsx`)

  // Build a map of component names that have CSS Modules (from named styles)
  const stylesByComponent = new Map<string, string>()
  for (const style of tatemono.styles.filter(s => s.name)) {
    stylesByComponent.set(style.name, style.name)
  }

  // Extract PascalCase component names from components block
  // Skip types and ALL_CAPS constants (only extract actual components)
  const extractedComponents = new Set<string>()
  for (const component of tatemono.components) {
    const componentMatches = component.raw.match(/(?:export\s+)?const\s+([A-Z][A-Za-z0-9_$]*)\s*[=:(]/g) || []
    for (const match of componentMatches) {
      const name = match.match(/const\s+([A-Z][A-Za-z0-9_$]*)/)?.[1]
      if (name && !/^[A-Z_]+$/.test(name)) {  // Skip if all uppercase (constants like FEATURES, COLORS)
        extractedComponents.add(name)
      }
    }
  }

  // Generate individual component files that import from _components
  for (const compName of extractedComponents) {
    const fileName = `${compName}.tsx`
    const filePath = path.join(componentsDir, fileName)
    
    const cssImport = stylesByComponent.has(compName)
      ? `import styles from '../styles/${compName}.module.css'\n`
      : ''
    
    const content = `'use client'
// ============================================================
// ARKZEN GENERATED COMPONENT — ${compName}
// Re-exported from _components.tsx
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: ${new Date().toISOString()}
// ============================================================

${cssImport}export { ${compName} } from './_components'
`
    fs.writeFileSync(filePath, content, 'utf-8')
    console.log(`[Arkzen Router] ✓ Component: ${fileName}`)
  }

  // Clean up old loose files
  try {
    const files = fs.readdirSync(componentsDir)
    for (const file of files) {
      if (file.endsWith('.tsx') && !file.startsWith('_') && !extractedComponents.has(file.replace('.tsx', ''))) {
        fs.unlinkSync(path.join(componentsDir, file))
      }
    }
  } catch (e) {
    // ignore
  }
}

// ─────────────────────────────────────────────
// GENERATE COMPONENTS INDEX FILE (for easy imports)
// ─────────────────────────────────────────────

function generateComponentsIndex(tatemono: ParsedTatemono, baseDir: string): void {
  if (tatemono.components.length === 0) return

  const componentsDir = path.join(baseDir, 'components')
  const indexPath = path.join(componentsDir, 'index.ts')

  // Export everything from _components (utilities, types, components)
  const content = `// ============================================================
// ARKZEN GENERATED COMPONENTS INDEX — ${tatemono.meta.name}
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: ${new Date().toISOString()}
// ============================================================

export * from './_components'
`
  fs.writeFileSync(indexPath, content, 'utf-8')
  console.log(`[Arkzen Router] ✓ Components index: index.ts`)
}

// ─────────────────────────────────────────────
// GENERATE PAGE FILE — one per route
// ─────────────────────────────────────────────

function generatePageFile(
  tatemono: ParsedTatemono,
  page: ArkzenPage,
  animationFnName: string | null,
  componentsImportPath: string
): string {
  const componentName = extractComponentName(page.name, page.raw)
  const layoutImport  = getLayoutImport(page.layout, tatemono.meta)
  const layoutComp    = getLayoutComponent(page.layout)
  const animImport    = animationFnName
    ? `import { ${animationFnName}, pageVariants } from '@/arkzen/generated/${tatemono.meta.name}.animations'`
    : ''
  const isAuthLayout  = page.layout === 'auth'
  const isGuestLayout = page.layout === 'guest'

  const isGuestOnly   = isGuestLayout && (
    (page as any).guestOnly === true ||
    (tatemono.meta.auth && ['login', 'register', 'forgot-password', 'reset-password'].includes(page.name))
  )

  // Extract React hooks/imports from component code so we can merge them
  const reactHooks = new Set(['useRef', 'useEffect'])
  const componentCodeLines: string[] = []
  let componentCode = ''
  
  for (const comp of tatemono.components) {
    let raw = comp.raw.trim()
    
    // Extract React imports from component
    const reactImportMatch = raw.match(/import\s+React[,\s]*\{([^}]*)\}\s+from\s+['"]react['"]/)
    if (reactImportMatch) {
      const hooks = reactImportMatch[1].split(',').map(h => h.trim()).filter(h => h && h !== 'React')
      hooks.forEach(h => reactHooks.add(h))
    }
    
    // Remove 'use client' directives and React imports (we'll provide them)
    raw = raw.replace(/^['"]use client['"];?\s*\n?/gm, '')
    raw = raw.replace(/^import\s+React[,\s]*\{[^}]*\}\s+from\s+['"]react['"]\s*;?\n?/gm, '')
    raw = raw.replace(/^import\s+\{[^}]*React[^}]*\}\s+from\s+['"]react['"]\s*;?\n?/gm, '')
    
    const cleaned = raw.trim()
    if (cleaned) componentCodeLines.push(cleaned)
  }
  
  componentCode = componentCodeLines.join('\n\n')
  
  // Build merged React import
  const hooksArray = Array.from(reactHooks).sort()
  const reactImport = `import React, { ${hooksArray.join(', ')} } from 'react'`

  return `'use client'
// ============================================================
// ARKZEN GENERATED PAGE — ${tatemono.meta.name}/${page.name}
// Layout: ${page.layout} | Auth guard: ${isAuthLayout} | Guest-only: ${isGuestOnly}
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: ${new Date().toISOString()}
// ============================================================

${reactImport}
import { motion } from 'framer-motion'
${layoutImport}
${animImport}

// Utilities, types, and helper functions from @arkzen:components
${componentCode}

// Page component code (from @arkzen:page:${page.name})
${page.raw.trim()}

// Wrapper for animation + layout
const ArkzenPage_${toPascalCase(tatemono.meta.name)}_${toPascalCase(page.name)} = () => {
  const pageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pageRef.current) return
    ${animationFnName ? `const cleanup = ${animationFnName}(pageRef)\n    return cleanup` : '// No animations'}
  }, [])

  return (
    <${layoutComp}${isAuthLayout ? ' requireAuth={true}' : ''}${isGuestOnly ? ' guestOnly={true}' : ''}>
      <motion.div
        ref={pageRef}
        variants={${animationFnName ? 'pageVariants' : '{}'}}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <${componentName} />
      </motion.div>
    </${layoutComp}>
  )
}

export default ArkzenPage_${toPascalCase(tatemono.meta.name)}_${toPascalCase(page.name)}
`
}

// ─────────────────────────────────────────────
// GENERATE ANIMATION FILE
// ─────────────────────────────────────────────

function generateAnimationFile(tatemono: ParsedTatemono): string | null {
  if (!tatemono.animation) return null

  const animFnName = toCamelCase(tatemono.meta.name) + 'Animations'
  const cleanAnimation = tatemono.animation.raw
    .replace(/import.*from ['"]gsap['"][;]?\n?/g, '')
    .replace(/import.*from ['"]gsap\/ScrollTrigger['"][;]?\n?/g, '')
    .replace(/import React.*from ['"]react['"][;]?\n?/g, '')
    .replace(/gsap\.registerPlugin\(.*\)[;]?\n?/g, '')
    .replace(`const ${animFnName}`, `export const ${animFnName}`)
    .trim()

  return `// ============================================================
// ARKZEN GENERATED ANIMATIONS — ${tatemono.meta.name}
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: ${new Date().toISOString()}
// ============================================================

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import React from 'react'

gsap.registerPlugin(ScrollTrigger)

${cleanAnimation}
`
}

// ─────────────────────────────────────────────
// GENERATE CUSTOM LAYOUTS
// ─────────────────────────────────────────────

function generateCustomLayouts(tatemono: ParsedTatemono, baseDir: string): void {
  if (tatemono.layouts.length === 0) return

  const customLayoutDir = path.join(
    path.resolve(process.cwd(), 'arkzen', 'core', 'layouts', 'custom')
  )
  fs.mkdirSync(customLayoutDir, { recursive: true })

  for (const layout of tatemono.layouts) {
    const fileName = `${layout.name}.tsx`
    const filePath = path.join(customLayoutDir, fileName)
    const content  = `'use client'\n// ARKZEN CUSTOM LAYOUT — ${layout.name}\n// Generated from tatemono: ${tatemono.meta.name}\n\n${layout.raw}\n`
    fs.writeFileSync(filePath, content, 'utf-8')
    console.log(`[Arkzen Router] ✓ Custom layout: ${fileName}`)
  }
}

// ─────────────────────────────────────────────
// GENERATE ERROR HANDLER FILES — v6 (fixed imports + catch‑all for 404)
// ─────────────────────────────────────────────

function generateNotFoundFile(tatemono: ParsedTatemono, handler: ArkzenErrorHandler): string {
  // Strip 'use client' from raw if present — not-found can be server component
  const raw = handler.raw.replace(/'use client'[;]?\n?/, '').trim()

  return `// ============================================================
// ARKZEN GENERATED — ${tatemono.meta.name}/not-found.tsx
// Next.js segment-scoped 404 handler.
// Rendered when notFound() is called or no route matches under /${tatemono.meta.name}.
// DO NOT EDIT DIRECTLY. Edit the @arkzen:error:404 block in the tatemono instead.
// Generated: ${new Date().toISOString()}
// ============================================================

import React from 'react'
import { ErrorScreen } from './components'

${raw}

export default NotFoundPage
`
}

function generateErrorFile(tatemono: ParsedTatemono, handler: ArkzenErrorHandler): string {
  const raw = handler.raw.replace(/'use client'[;]?\n?/, '').trim()

  return `'use client'
// ============================================================
// ARKZEN GENERATED — ${tatemono.meta.name}/error.tsx
// Next.js segment-scoped runtime error boundary.
// Rendered when an unhandled exception is thrown during render under /${tatemono.meta.name}.
// Must be a Client Component — Next.js requirement.
// DO NOT EDIT DIRECTLY. Edit the @arkzen:error:500 block in the tatemono instead.
// Generated: ${new Date().toISOString()}
// ============================================================

import React from 'react'
import { ErrorScreen } from './components'

${raw}

export default function ArkzenError_${toPascalCase(tatemono.meta.name)}({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ServerErrorPage reset={reset} />
}
`
}

function generateCatchAllRoute(tatemono: ParsedTatemono, tatemonoDir: string): void {
  const catchAllDir = path.join(tatemonoDir, '[...catchAll]')
  fs.mkdirSync(catchAllDir, { recursive: true })
  const content = `import { notFound } from 'next/navigation'

export default function CatchAllPage() {
  notFound()
}
`
  fs.writeFileSync(path.join(catchAllDir, 'page.tsx'), content, 'utf-8')
  console.log(`[Arkzen Router] ✓ Catch-all route created for ${tatemono.meta.name} (real 404 status)`)
}

function generateErrorHandlers(tatemono: ParsedTatemono, tatemonoDir: string): void {
  if (!tatemono.errorHandlers || tatemono.errorHandlers.length === 0) return

  let has404 = false
  for (const handler of tatemono.errorHandlers) {
    if (handler.type === '404') {
      has404 = true
      const content = generateNotFoundFile(tatemono, handler)
      fs.writeFileSync(path.join(tatemonoDir, 'not-found.tsx'), content, 'utf-8')
      console.log(`[Arkzen Router] ✓ Error handler: not-found.tsx → /${tatemono.meta.name}/**`)
    } else if (handler.type === '500') {
      const content = generateErrorFile(tatemono, handler)
      fs.writeFileSync(path.join(tatemonoDir, 'error.tsx'), content, 'utf-8')
      console.log(`[Arkzen Router] ✓ Error handler: error.tsx → /${tatemono.meta.name}/**`)
    }
  }
  if (has404) {
    generateCatchAllRoute(tatemono, tatemonoDir)
  }
}

// ─────────────────────────────────────────────
// GENERATE TATEMONO LAYOUT WITH FAVICON
// ─────────────────────────────────────────────

function generateTatemonoLayout(tatemono: ParsedTatemono, tatemonoDir: string): void {
  const hasGlobalStyle = tatemono.styles.some(s => !s.name)
  const hasFavicon = !!tatemono.meta.favicon

  if (!hasFavicon && !hasGlobalStyle) return // Nothing to add to layout

  const globalImport = hasGlobalStyle ? `import './styles/global.css'\n` : ''
  
  const metadataCode = hasFavicon ? `export const metadata: Metadata = {
  icons: {
    icon: '${tatemono.meta.favicon}',
  },
}` : ''

  const metadataImport = hasFavicon ? `import type { Metadata } from 'next'\n` : ''

  const content = `${metadataImport}${globalImport}
${hasFavicon ? metadataCode + '\n\n' : ''}export default function ${toPascalCase(tatemono.meta.name)}Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
`
  
  fs.writeFileSync(path.join(tatemonoDir, 'layout.tsx'), content, 'utf-8')
  if (hasGlobalStyle) console.log(`[Arkzen Router] ✓ Global style imported in layout`)
  if (hasFavicon) console.log(`[Arkzen Router] ✓ Favicon configured: ${tatemono.meta.favicon}`)
}

// ─────────────────────────────────────────────
// GENERATE CSS STYLES — v6.4
// Generates global.css for @arkzen:style and CSS Modules for named styles
// ─────────────────────────────────────────────

function generateGlobalStyleFile(tatemono: ParsedTatemono, tatemonoDir: string): void {
  const globalStyles = tatemono.styles.filter(s => !s.name)
  if (globalStyles.length === 0) return

  const stylesFolder = path.join(tatemonoDir, 'styles')
  if (!fs.existsSync(stylesFolder)) {
    fs.mkdirSync(stylesFolder, { recursive: true })
  }

  const globalStyle = globalStyles[0]
  const content = globalStyle.raw

  fs.writeFileSync(path.join(stylesFolder, 'global.css'), content, 'utf-8')
  console.log(`[Arkzen Router] ✓ Global style: styles/global.css`)
}

function generateCSSModuleFiles(tatemono: ParsedTatemono, tatemonoDir: string): void {
  const namedStyles = tatemono.styles.filter(s => s.name)
  if (namedStyles.length === 0) return

  const stylesFolder = path.join(tatemonoDir, 'styles')
  if (!fs.existsSync(stylesFolder)) {
    fs.mkdirSync(stylesFolder, { recursive: true })
  }

  for (const style of namedStyles) {
    const filename = `${style.name}.module.css`
    fs.writeFileSync(path.join(stylesFolder, filename), style.raw, 'utf-8')
    console.log(`[Arkzen Router] ✓ Style module: styles/${filename}`)
  }
}

// ─────────────────────────────────────────────
// MAIN REGISTER — creates one route per page
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// GENERATE ROOT REDIRECT — v5.1
//
// Problem: When a tatemono has no page named "index", the router
// creates app/{name}/_components.tsx but no app/{name}/page.tsx.
// Visiting /{name} returns a Next.js 404.
//
// Fix: If no index page exists, auto-generate a root page.tsx that
// immediately redirects to the correct landing page:
//   - First guest page (if auth: true) → login page
//   - First auth page (if auth: false or no guest page)
//   - First page overall as final fallback
//
// This is a Next.js server redirect so there is no flash — the
// browser never renders the root URL at all.
// ─────────────────────────────────────────────

function generateRootRedirect(tatemono: ParsedTatemono): string {
  const pages    = tatemono.pages
  const hasIndex = pages.some(p => p.name === 'index')
  if (hasIndex) return '' // root is already a real page — nothing needed

  // Pick the best landing page
  const firstGuest = pages.find(p => p.layout === 'guest')
  const firstAuth  = pages.find(p => p.layout === 'auth')
  const firstPage  = pages[0]

  // If auth is enabled, the landing page should be the login (guest) page
  const target = tatemono.meta.auth
    ? (firstGuest ?? firstAuth ?? firstPage)
    : (firstAuth  ?? firstGuest ?? firstPage)

  if (!target) return ''

  const destination = `/${tatemono.meta.name}/${target.name}`

  return `// ============================================================
// ARKZEN GENERATED ROOT REDIRECT — ${tatemono.meta.name}
// Visiting /${tatemono.meta.name} redirects to ${destination}
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: ${new Date().toISOString()}
// ============================================================

import { redirect } from 'next/navigation'

export default function ArkzenRoot_${toPascalCase(tatemono.meta.name)}() {
  redirect('${destination}')
}
`
}

export function registerPage(tatemono: ParsedTatemono): void {
  const routerType = detectRouterType()
  const animFnName = tatemono.animation
    ? toCamelCase(tatemono.meta.name) + 'Animations'
    : null

  console.log(`[Arkzen Router] Registering ${tatemono.pages.length} page(s) for: ${tatemono.meta.name}`)

  // Generate animation file if present
  if (tatemono.animation) {
    const generatedDir = path.resolve(process.cwd(), 'arkzen', 'generated')
    fs.mkdirSync(generatedDir, { recursive: true })
    const animContent = generateAnimationFile(tatemono)
    if (animContent) {
      const animPath = path.join(generatedDir, `${tatemono.meta.name}.animations.ts`)
      fs.writeFileSync(animPath, animContent, 'utf-8')
      console.log(`[Arkzen Router] ✓ Animation file generated`)
    }
  }

  // Generate custom layouts
  generateCustomLayouts(tatemono, '')

  if (routerType === 'app') {
    const tatemonoDir = path.join(APP_DIR, tatemono.meta.name)
    fs.mkdirSync(tatemonoDir, { recursive: true })
    
    // Generate individual component files + index
    generateIndividualComponentFiles(tatemono, tatemonoDir)
    generateComponentsIndex(tatemono, tatemonoDir)

    // v6: generate segment-scoped Next.js error handler files + catch‑all for 404
    generateErrorHandlers(tatemono, tatemonoDir)

    // Generate layout.tsx with favicon if specified in meta
    generateTatemonoLayout(tatemono, tatemonoDir)

    // v6.4: generate CSS styles (global + CSS Modules)
    generateGlobalStyleFile(tatemono, tatemonoDir)
    generateCSSModuleFiles(tatemono, tatemonoDir)

    // v5.1: auto-generate root redirect when no index page is declared
    const rootRedirect = generateRootRedirect(tatemono)
    if (rootRedirect) {
      fs.writeFileSync(path.join(tatemonoDir, 'page.tsx'), rootRedirect, 'utf-8')
      const target = tatemono.meta.auth
        ? (tatemono.pages.find(p => p.layout === 'guest') ?? tatemono.pages[0])
        : tatemono.pages[0]
      console.log(`[Arkzen Router] ✓ /${tatemono.meta.name} → redirect to /${tatemono.meta.name}/${target?.name}`)
    }

    for (const page of tatemono.pages) {
      if (page.name === 'index') {
        // Index page: write page.tsx directly in tatemonoDir (overwrites the redirect)
        const pagePath = path.join(tatemonoDir, 'page.tsx')
        const pageContent = generatePageFile(tatemono, page, animFnName, './components')
        fs.writeFileSync(pagePath, pageContent, 'utf-8')
        console.log(`[Arkzen Router] ✓ /${tatemono.meta.name} [${page.layout}]`)
      } else {
        // Other pages: create subfolder and write page.tsx inside
        const pageDir = path.join(tatemonoDir, page.name)
        fs.mkdirSync(pageDir, { recursive: true })
        const pageContent = generatePageFile(tatemono, page, animFnName, '../components')
        fs.writeFileSync(path.join(pageDir, 'page.tsx'), pageContent, 'utf-8')
        console.log(`[Arkzen Router] ✓ /${tatemono.meta.name}/${page.name} [${page.layout}]`)
      }
    }
  } else {
    // Pages router (similar logic)
    const tatemonoDir = path.join(PAGES_DIR, tatemono.meta.name)
    fs.mkdirSync(tatemonoDir, { recursive: true })
    
    // Generate individual component files + index
    generateIndividualComponentFiles(tatemono, tatemonoDir)
    generateComponentsIndex(tatemono, tatemonoDir)

    // v6: generate segment-scoped error handler files + catch‑all for 404
    generateErrorHandlers(tatemono, tatemonoDir)

    // v6.4: generate CSS styles (global + CSS Modules)
    generateGlobalStyleFile(tatemono, tatemonoDir)
    generateCSSModuleFiles(tatemono, tatemonoDir)

    // v5.1: auto-generate root redirect when no index page is declared
    const rootRedirectPages = generateRootRedirect(tatemono)
    if (rootRedirectPages) {
      fs.writeFileSync(path.join(tatemonoDir, 'index.tsx'), rootRedirectPages, 'utf-8')
      const target = tatemono.meta.auth
        ? (tatemono.pages.find(p => p.layout === 'guest') ?? tatemono.pages[0])
        : tatemono.pages[0]
      console.log(`[Arkzen Router] ✓ /${tatemono.meta.name} → redirect to /${tatemono.meta.name}/${target?.name}`)
    }

    for (const page of tatemono.pages) {
      if (page.name === 'index') {
        const pagePath = path.join(tatemonoDir, 'index.tsx')
        const pageContent = generatePageFile(tatemono, page, animFnName, './components')
        fs.writeFileSync(pagePath, pageContent, 'utf-8')
        console.log(`[Arkzen Router] ✓ /${tatemono.meta.name} [${page.layout}]`)
      } else {
        const pageDir = path.join(tatemonoDir, page.name)
        fs.mkdirSync(pageDir, { recursive: true })
        const pageContent = generatePageFile(tatemono, page, animFnName, '../components')
        fs.writeFileSync(path.join(pageDir, 'index.tsx'), pageContent, 'utf-8')
        console.log(`[Arkzen Router] ✓ /${tatemono.meta.name}/${page.name} [${page.layout}]`)
      }
    }
  }

  console.log(`[Arkzen Router] ✓ All pages registered for: ${tatemono.meta.name}`)

  // Distribute assets from tatemono's assets/ folder
  try {
    const tatemonosDir = path.resolve(process.cwd(), '..', '..', 'tatemonos')
    const assetsPath = path.join(tatemonosDir, tatemono.meta.name, 'assets')
    const publicDir = path.resolve(process.cwd(), 'public')
    
    // Clean old assets first (in case files were removed from tatemono)
    cleanOldAssets(tatemono.meta.name, publicDir)
    
    // Copy new assets
    const hasAssets = copyAssetsToPublic(tatemono.meta.name, assetsPath, publicDir)
    if (!hasAssets) {
      // No assets folder or it's empty — that's fine, just log it
      console.log(`[Arkzen Assets] No assets folder for ${tatemono.meta.name}`)
    }
  } catch (e) {
    console.log(`[Arkzen Assets] ⚠ Asset distribution skipped: ${e}`)
  }

  // Generate sitemap and robots.txt after all pages registered
  try {
    const registry = getRegistry()
    writeSitemap(registry)
    writeRobotsTxt()
  } catch (e) {
    console.log(`[Arkzen Router] ⚠ Sitemap generation skipped`)
  }
}

// ─────────────────────────────────────────────
// WRITE ROBOTS.TXT
// ─────────────────────────────────────────────

function writeRobotsTxt(): void {
  const publicDir = path.resolve(process.cwd(), 'public')
  fs.mkdirSync(publicDir, { recursive: true })

  const robotsPath = path.join(publicDir, 'robots.txt')
  const content = `User-agent: *
Allow: /

Sitemap: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/sitemap.xml
`
  fs.writeFileSync(robotsPath, content, 'utf-8')
  console.log(`[Arkzen Router] ✓ robots.txt generated`)
}

// ─────────────────────────────────────────────
// UNREGISTER — removes entire tatemono directory
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// UNREGISTER — two modes
//
// softUnregister: used during REBUILD — does NOT delete the app/{name}/
//   folder. registerPage will overwrite files in place. This prevents
//   Next.js Fast Refresh from seeing a deleted route mid-write and
//   caching a 404 for the new pages.
//
// unregisterPage: used during REMOVE — deletes everything.
// ─────────────────────────────────────────────

export function softUnregisterPage(tatemononName: string): void {
  console.log(`[Arkzen Router] Soft-unregistering (rebuild): ${tatemononName}`)

  // Only remove the animation file — leave app/{name}/ intact so
  // Next.js doesn't see a missing route during the write phase.
  const animationPath = path.resolve(
    process.cwd(), 'arkzen', 'generated', `${tatemononName}.animations.ts`
  )
  if (fs.existsSync(animationPath)) {
    fs.unlinkSync(animationPath)
    console.log(`[Arkzen Router] ✓ Animation file removed`)
  }
}

export function unregisterPage(tatemononName: string): void {
  console.log(`[Arkzen Router] Unregistering: ${tatemononName}`)

  const routerType = detectRouterType()

  if (routerType === 'app') {
    const tatemonoDir = path.join(APP_DIR, tatemononName)
    if (fs.existsSync(tatemonoDir)) {
      fs.rmSync(tatemonoDir, { recursive: true })
      console.log(`[Arkzen Router] ✓ Removed: ${tatemonoDir}`)
    }
  } else {
    const tatemonoDir = path.join(PAGES_DIR, tatemononName)
    if (fs.existsSync(tatemonoDir)) {
      fs.rmSync(tatemonoDir, { recursive: true })
      console.log(`[Arkzen Router] ✓ Removed: ${tatemonoDir}`)
    }
  }

  // Remove animation file
  const animationPath = path.resolve(
    process.cwd(), 'arkzen', 'generated', `${tatemononName}.animations.ts`
  )
  if (fs.existsSync(animationPath)) {
    fs.unlinkSync(animationPath)
    console.log(`[Arkzen Router] ✓ Animation file removed`)
  }
}

// ─────────────────────────────────────────────
// STRING HELPERS
// ─────────────────────────────────────────────

function toPascalCase(str: string): string {
  return str.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')
}

function toCamelCase(str: string): string {
  const p = toPascalCase(str)
  return p.charAt(0).toLowerCase() + p.slice(1)
}

/**
 * Converts a page name to a safe React component name.
 * Handles numeric names like "400" → "Page400" so the identifier is valid JS.
 * e.g. "400" → "Page400Page", "dashboard" → "DashboardPage"
 */
function toSafeComponentName(pageName: string): string {
  const pascal = toPascalCase(pageName)
  // If it starts with a digit, prefix with "Page" to make it a valid identifier
  return /^\d/.test(pascal) ? `Page${pascal}` : pascal
}