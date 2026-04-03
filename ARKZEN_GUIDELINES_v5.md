# ARKZEN GUIDELINES DOCUMENT v5.0
## For Claude AI — Generating Tatemono Files

---

## SECTION 1 — WHAT IS ARKZEN

Arkzen is a full stack scaffolding engine built on Next.js TypeScript and Laravel. It uses a single file format called a **Tatemono** to define an entire system — multiple database tables, multiple backend API resources, middleware, multiple frontend pages and components, multiple stores, real-time channels, background jobs, notifications, events, and animations — all in one file.

**One Tatemono = one complete client system.**

The engine is a **distribution tool**. It does NOT control or limit. The user controls everything. The engine just distributes the user's instructions to the right places.

**Stack:**
- Frontend: Next.js 16 + TypeScript + **Tailwind CSS** (required — see Section 2) + Zustand
- Backend: Laravel 13 + SQLite + Laravel Sanctum
- Real-time: Laravel Reverb + custom CRDT
- Animation: GSAP + Framer Motion
- Icons: Lucide React + Hero Icons
- Optional: Matter.js, Three.js, TipTap, Leaflet

---

## SECTION 2 — TAILWIND CSS POLICY

**Tailwind CSS is the required default for all styling in Tatemono files.**

This is a hard requirement for AI generation:
- All custom components use Tailwind utility classes
- All page layouts use Tailwind utility classes
- All engine utility classes (arkzen-container, arkzen-card, etc.) are Tailwind-based

**What IS allowed for advanced customization:**
```tsx
// CSS modules — allowed for complex animations or design system overrides
import styles from './page.module.css'
<div className={styles.specialEffect}>...</div>

// Inline styles — allowed for dynamic values (computed widths, colors from data)
<div style={{ width: `${progress}%`, backgroundColor: brandColor }}>...</div>

// CSS variables — allowed for theming
<div style={{ '--accent': '#FF5733' } as React.CSSProperties}>...</div>
```

**What is NOT allowed:**
- Plain CSS replacing Tailwind (no `import './styles.css'` as the primary styling approach)
- Styled-components or Emotion (not installed)
- Bootstrap or other CSS frameworks
- CSS-in-JS replacing Tailwind classes

**Rule:** Default to Tailwind. Use alternatives only when Tailwind is genuinely insufficient for a specific effect.

---

## SECTION 3 — TATEMONO FILE RULES

```
1. One Tatemono = one complete system (multiple tables, pages, API resources)
2. File extension is always .tsx
3. File name is always lowercase with hyphens
   CORRECT:   pos-system
   CORRECT:   project-management
   WRONG:     PosSystem

4. Sections declared with @arkzen markers
5. Sections must appear in this EXACT order:
   @arkzen:meta                    (once)
   @arkzen:config                  (optional, once)
   @arkzen:database:identifier     (REPEAT — one per table)
   @arkzen:api:identifier          (REPEAT — one per resource group)
   @arkzen:store:identifier        (optional, REPEAT — one per store)
   @arkzen:realtime:identifier     (optional, REPEAT)
   @arkzen:events:identifier       (optional, REPEAT)
   @arkzen:jobs:identifier         (optional, REPEAT)
   @arkzen:notifications:identifier(optional, REPEAT)
   @arkzen:mail:identifier         (optional, REPEAT)
   @arkzen:console:identifier      (optional, REPEAT)
   @arkzen:layout:name             (optional, REPEAT — custom layouts)
   @arkzen:components:identifier   (REPEAT — one per group)
   @arkzen:page:name               (REPEAT — one per page/route)
   @arkzen:animation               (optional, once)

6. ALL markers now repeatable with identifiers (see each section)
7. Everything is TypeScript strictly typed — no 'any'
8. All imports go inside @arkzen:components blocks
9. Each tatemono is a self-contained system
```

---

## SECTION 4 — @arkzen:meta

```tsx
/* @arkzen:meta
name: pos-system
version: 1.0.0
description: Full point-of-sale system
auth: true
dependencies: []
*/
```

**Fields:**
- `name` — required. kebab-case. Must match file name.
- `version` — optional. Defaults to 1.0.0.
- `description` — optional. Human-readable description.
- `auth` — optional. `true` enables global authentication guard. All layout:auth pages require login. All layout:guest pages redirect logged-in users away.
- `dependencies` — optional. List of other tatemono names this depends on.

**NOTE: `layout` field is REMOVED from meta in v5.** Layout is now declared per-page. See Section 12.

---

## SECTION 5 — @arkzen:config (optional, once)

```tsx
/* @arkzen:config
modal:
  borderRadius: 2xl
  backdrop: blur
  animation: fadeScale
toast:
  position: top-right
  duration: 3000
table:
  striped: true
  hoverable: true
layout:
  guest:
    className: "min-h-screen bg-gray-50"
  auth:
    className: "min-h-screen bg-white"
*/
```

---

## SECTION 6 — @arkzen:database (REPEAT — identifier required)

Declare one block per table. Each has a unique identifier.

```tsx
/* @arkzen:database:products
table: products
timestamps: true
softDeletes: false

columns:
  id:
    type: integer
    primary: true
    autoIncrement: true
  name:
    type: string
    length: 255
    nullable: false
  sku:
    type: string
    length: 100
    unique: true
    nullable: false
  price:
    type: decimal
    precision: 10
    scale: 2
    nullable: false
  stock:
    type: integer
    default: 0
    nullable: false
  category_id:
    type: integer
    foreign: categories.id
    onDelete: cascade
    nullable: true

seeder:
  count: 5
  data:
    - name: Sample Product
      sku: SKU-001
      price: 99.99
      stock: 100
*/

/* @arkzen:database:orders
table: orders
timestamps: true
columns:
  id:
    type: integer
    primary: true
    autoIncrement: true
  user_id:
    type: integer
    foreign: users.id
    onDelete: set null
    nullable: true
  total:
    type: decimal
    precision: 10
    scale: 2
    nullable: false
  status:
    type: string
    length: 50
    default: pending
    nullable: false
*/
```

**Column types:** `integer, bigInteger, string, text, longText, decimal, float, boolean, date, datetime, timestamp, json, uuid`

**Rules:**
```
1. Identifier after @arkzen:database: must match table name concept (e.g. database:products → table: products)
2. Table name always plural snake_case
3. Foreign keys reference table.column (within same tatemono OR users table ONLY)
4. Seeder is optional per table
5. softDeletes: true adds deleted_at
6. Engine auto-sorts migrations by foreign key dependency — declare in any order
```

---

## SECTION 7 — @arkzen:api (REPEAT — identifier required)

One block per model/controller pair.

```tsx
/* @arkzen:api:products
model: Product
controller: ProductController
prefix: /api/products
middleware: [auth:sanctum, throttle:60,1]
resource: true
policy: true
factory: true

endpoints:
  index:
    method: GET
    route: /
    description: Get paginated product list
    query:
      search: string|optional
      per_page: integer|default:15
    response:
      type: paginated

  store:
    method: POST
    route: /
    description: Create product
    validation:
      name: required|string|max:255
      sku: required|string|unique:products
      price: required|numeric|min:0
      stock: required|integer|min:0
    response:
      type: single

  update:
    method: PUT
    route: /{id}
    description: Update product
    validation:
      name: sometimes|string|max:255
      price: sometimes|numeric|min:0
    response:
      type: single

  destroy:
    method: DELETE
    route: /{id}
    description: Delete product
    response:
      type: message
      value: Product deleted
*/
```

**Middleware options:**
```
[]                        → public
[auth:sanctum]            → Sanctum token required
[auth:sanctum, throttle:60,1] → auth + 60 req/min
[auth:sanctum, role:admin] → auth + admin role only
[throttle:30,1]           → rate limit, no auth
```

**Optional flags per @arkzen:api block:**
```
resource: true   → generates API Resource class
policy: true     → generates Policy class
factory: true    → generates Model Factory
```

---

## SECTION 8 — @arkzen:store (REPEAT — identifier required)

```tsx
/* @arkzen:store:pos */

import { create } from 'zustand'
import { arkzenFetch } from '@/arkzen/core/stores/authStore'

interface PosState {
  cart:       CartItem[]
  addToCart:  (product: Product, qty: number) => void
  clearCart:  () => void
}

const usePosStore = create<PosState>((set) => ({
  cart:      [],
  addToCart: (product, qty) => set(s => ({ cart: [...s.cart, { product, qty }] })),
  clearCart: () => set({ cart: [] }),
}))

/* @arkzen:store:pos:end */
```

Multiple stores — use distinct identifiers:
```tsx
/* @arkzen:store:auth */  ... /* @arkzen:store:auth:end */
/* @arkzen:store:ui */    ... /* @arkzen:store:ui:end */
/* @arkzen:store:pos */   ... /* @arkzen:store:pos:end */
```

---

## SECTION 9 — @arkzen:realtime (REPEAT — identifier required)

```tsx
/* @arkzen:realtime:orders
channels:
  orders:
    type: private
    auth: authenticated
  pos-floor:
    type: presence
    auth: authenticated
events:
  order-created:
    channel: orders
    type: private
*/
```

---

## SECTION 10 — @arkzen:events (REPEAT — identifier required)

```tsx
/* @arkzen:events:order
order-placed:
  listeners: [SendOrderConfirmation, UpdateProductStock, NotifyKitchen]
*/

/* @arkzen:events:user
user-registered:
  listeners: [SendWelcomeEmail]
*/
```

---

## SECTION 11 — @arkzen:jobs, @arkzen:notifications, @arkzen:mail, @arkzen:console

All now REPEAT with identifiers:

```tsx
/* @arkzen:jobs:email
send-welcome-email:
  queue: emails
  tries: 3
  timeout: 120
*/

/* @arkzen:jobs:reports
generate-daily-report:
  queue: reports
  tries: 1
  timeout: 300
  schedule: daily
*/

/* @arkzen:notifications:order
order-confirmed:
  channels: [database, mail]
  message: Your order has been confirmed
  subject: Order Confirmation
*/

/* @arkzen:mail:receipts
order-receipt:
  subject: Your Order Receipt
  data:
    order_number: string
    total: string
*/

/* @arkzen:console:sync
sync-inventory:
  signature: arkzen:sync-inventory
  description: Syncs inventory levels
daily-cleanup:
  signature: arkzen:daily-cleanup
  description: Removes old temporary records
  schedule: daily
*/
```

---

## SECTION 12 — LAYOUT SYSTEM (v5)

### Two Base Layouts

| Layout | Type | Guard |
|--------|------|-------|
| `guest` | Public | Redirects logged-in users away (if `auth: true` in meta) |
| `auth`  | Protected | Redirects unauthenticated users to login |

**Both layouts are EMPTY. No sidebar, no topbar, no forced structure. You build your own.**

Each page declares its layout using `/* @arkzen:page:layout:X */` inside the page block.

### Auth Redirect Behavior
- Unauthenticated user visits `layout:auth` page → redirect to first `layout:guest` page
- Authenticated user visits `layout:guest` page → redirect to first `layout:auth` page
- `auth: false` in meta → all pages public, no guard runs

### Custom Layouts

Define reusable layouts for shared structures (sidebar+topbar, etc.):

```tsx
/* @arkzen:layout:dashboard-layout */
export const DashboardLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-screen bg-neutral-50">
    <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col">
      {/* Your sidebar */}
      <nav className="p-4">...</nav>
    </aside>
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="h-16 bg-white border-b border-neutral-200 px-6 flex items-center">
        {/* Your topbar */}
      </header>
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  </div>
)
/* @arkzen:layout:dashboard-layout:end */
```

Then reference in pages:
```tsx
/* @arkzen:page:layout:dashboard-layout */
```

---

## SECTION 13 — @arkzen:components (REPEAT — identifier required)

All imports MUST go here. Custom components for this system go here.
Split by logical grouping — one block per section of the system.

```tsx
/* @arkzen:components:shared */

'use client'

import React, { useState, useEffect } from 'react'
import { Package, ShoppingCart, Plus, Trash2 } from 'lucide-react'
import { Modal }      from '@/arkzen/core/components/Modal'
import { Table }      from '@/arkzen/core/components/Table'
import { useToast }   from '@/arkzen/core/components/Toast'
import { useQuery }   from '@/arkzen/core/hooks/useQuery'
import { useMutation } from '@/arkzen/core/hooks/useMutation'
import { arkzenFetch, useAuthStore } from '@/arkzen/core/stores/authStore'

// TypeScript interfaces
interface Product {
  id:    number
  name:  string
  price: number
  stock: number
}

/* @arkzen:components:shared:end */

/* @arkzen:components:dashboard */

'use client'

import React from 'react'

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <div className="arkzen-card p-4">
    <h3 className="text-sm text-neutral-500">{label}</h3>
    <p className="text-2xl font-bold">{value}</p>
  </div>
)

/* @arkzen:components:dashboard:end */
```

**Available engine imports:**
```
Components:
  @/arkzen/core/components/Modal        (renderHeader, renderBody, renderFooter)
  @/arkzen/core/components/Drawer
  @/arkzen/core/components/Dialog       (renderIcon, renderContent, renderActions)
  @/arkzen/core/components/Table        (renderRow, renderHead, renderEmpty, renderToolbar)
  @/arkzen/core/components/Toast        (renderToast)  → also: useToast hook
  @/arkzen/core/components/Pagination   (renderPageButton, renderControls)
  @/arkzen/core/components/Breadcrumb   (renderItem, renderSeparator)
  @/arkzen/core/components/Loading      (renderSpinner)
  @/arkzen/core/components/EmptyState   (renderIcon, renderTitle, renderContent)
  @/arkzen/core/components/SortableList (renderItem)
  @/arkzen/core/components/Chart        (line, bar, area, donut — SVG)
  @/arkzen/core/components/FileUpload   (dropzone + auto-upload)
  @/arkzen/core/components/RichTextEditor (TipTap wrapper)
  @/arkzen/core/components/Map          (Leaflet wrapper)
  @/arkzen/core/components/utils        (Badge, Avatar, Tooltip, Field, Form)
    Badge      → renderContent
    Avatar     → renderFallback
    Tooltip    → renderTooltip
    Field      → renderLabel, renderError
    Form       → renderSubmit
    Pagination → renderPageButton, renderControls
    Breadcrumb → renderItem, renderSeparator
    EmptyState → renderIcon, renderTitle, renderContent
    Loading    → renderSpinner

Hooks:
  @/arkzen/core/hooks/useQuery     (fetch + cache + retry)
  @/arkzen/core/hooks/useMutation  (POST/PUT/DELETE + optimistic)
  @/arkzen/core/hooks/useWebSocket (Reverb connection)
  @/arkzen/core/hooks/useCRDT     (conflict resolution)

Auth:
  @/arkzen/core/stores/authStore   (useAuthStore, arkzenFetch)
```

### Component Render Slots (Universal Pattern)

Every engine component accepts `renderX` props to override ANY internal section:

```tsx
// Modal — override header and footer
<Modal
  open={open}
  onClose={onClose}
  renderHeader={(onClose) => (
    <div className="flex items-center justify-between p-4 border-b">
      <h2 className="font-bold text-lg">Custom Title</h2>
      <button onClick={onClose} className="p-1 rounded hover:bg-neutral-100">✕</button>
    </div>
  )}
  renderFooter={(onClose) => (
    <div className="flex gap-2 p-4 border-t">
      <button onClick={onClose} className="arkzen-btn-secondary flex-1">Cancel</button>
      <button onClick={handleSave} className="arkzen-btn-primary flex-1">Save</button>
    </div>
  )}
>
  {/* Your content */}
</Modal>

// Toast — completely custom toast rendering
<ToastProvider
  renderToast={(toast) => (
    <div className={`custom-toast toast-${toast.type} flex items-center gap-3 p-3 rounded-lg`}>
      <span>{toast.message}</span>
      <button onClick={toast.onClose}>✕</button>
    </div>
  )}
/>

// Table — custom row rendering
<Table
  columns={columns}
  data={data}
  renderRow={(item, index) => (
    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}>
      <td className="px-4 py-3">{item.name}</td>
      <td className="px-4 py-3 font-mono">{item.sku}</td>
    </tr>
  )}
  renderEmpty={() => (
    <div className="text-center py-12">
      <p className="text-neutral-400">No products yet</p>
      <button onClick={onAdd} className="mt-2 arkzen-btn-primary">Add First Product</button>
    </div>
  )}
/>

// Dialog — custom confirm dialog
<Dialog
  open={open}
  onConfirm={handleDelete}
  onCancel={() => setOpen(false)}
  title="Delete item?"
  renderIcon={() => <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">🗑</div>}
  renderActions={(onConfirm, onCancel) => (
    <div className="flex gap-2 mt-4">
      <button onClick={onCancel} className="arkzen-btn-secondary flex-1">Keep it</button>
      <button onClick={onConfirm} className="arkzen-btn-danger flex-1">Delete it</button>
    </div>
  )}
/>
```

---

## SECTION 14 — @arkzen:page (REPEAT — name required)

Each page is its own route: `/{tatemono-name}/{page-name}`

```tsx
/* @arkzen:page:login */
/* @arkzen:page:layout:guest */
const LoginPage = () => {
  const { login, isLoading } = useAuthStore()
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async () => {
    await login(email, password)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold mb-6">Sign In</h1>
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="arkzen-input w-full"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="arkzen-input w-full"
          />
          <button onClick={handleSubmit} disabled={isLoading} className="arkzen-btn-primary w-full">
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  )
}
/* @arkzen:page:login:end */

/* @arkzen:page:dashboard */
/* @arkzen:page:layout:auth */
const DashboardPage = () => {
  const { user, logout }             = useAuthStore()
  const { data: projects, isLoading } = useQuery<{ data: Project[] }>('/api/projects')

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Sidebar — user builds their own */}
      <aside className="w-64 bg-white border-r border-neutral-200 p-4">
        <h2 className="font-bold text-lg mb-6">MyApp</h2>
        <nav className="space-y-1">
          <a href="/client-portal/dashboard" className="block px-3 py-2 rounded-lg bg-neutral-900 text-white text-sm">Dashboard</a>
          <a href="/client-portal/projects" className="block px-3 py-2 rounded-lg text-neutral-600 hover:bg-neutral-100 text-sm">Projects</a>
        </nav>
        <div className="mt-auto pt-4 border-t border-neutral-200">
          <button onClick={logout} className="text-sm text-neutral-500 hover:text-neutral-900">Sign Out</button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-neutral-200 px-6 flex items-center justify-between">
          <h1 className="font-semibold">Dashboard</h1>
          <span className="text-sm text-neutral-500">Welcome, {user?.name}</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard label="Total Projects" value={projects?.data?.length ?? 0} />
          </div>
        </main>
      </div>
    </div>
  )
}
/* @arkzen:page:dashboard:end */
```

**Rules:**
```
1. Page name: kebab-case (e.g. page:dashboard, page:project-detail)
2. Layout declared inside page block: /* @arkzen:page:layout:guest */ or /* @arkzen:page:layout:auth */
3. Default layout is auth if not declared
4. Component name: PascalCase + Page (e.g. DashboardPage, LoginPage)
5. pageRef is NOT required on every page root (engine handles it)
6. Use useQuery instead of raw fetch for GET requests
7. Use useMutation instead of raw fetch for POST/PUT/DELETE
8. Do NOT export — engine handles it
9. No layout: in meta — layout is per-page now
10. At least one page required per tatemono
```

**Generated routes:**
```
/{tatemono-name}/login      → layout:guest
/{tatemono-name}/register   → layout:guest
/{tatemono-name}/dashboard  → layout:auth
/{tatemono-name}/projects   → layout:auth
```

**Utility classes:**
```
arkzen-container      → max-w-7xl mx-auto px-6 py-8
arkzen-card           → bg-white rounded-2xl border border-neutral-200
arkzen-input          → styled input field
arkzen-btn-primary    → dark filled button
arkzen-btn-secondary  → outlined button
arkzen-btn-danger     → red button
```

---

## SECTION 15 — @arkzen:animation (optional, once)

```tsx
/* @arkzen:animation */

import { gsap } from 'gsap'
import React from 'react'

const posSystemAnimations = (pageRef: React.RefObject<HTMLDivElement>) => {
  const ctx = gsap.context(() => {
    gsap.fromTo('.arkzen-card',
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out' }
    )
  }, pageRef)
  return () => ctx.revert()
}

export const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.2 } },
}

/* @arkzen:animation:end */
```

---

## SECTION 16 — WHAT AI MUST NEVER DO

```
1.  Never generate incomplete sections
2.  Never skip @arkzen:components or @arkzen:page sections
3.  Never use 'any' TypeScript type
4.  Never export components or pages manually
5.  Never put imports outside @arkzen:components blocks
6.  Never use non-Tailwind CSS as the primary styling approach (inline styles/CSS modules for specific cases OK)
7.  Never use class components — hooks only
8.  Never generate two tatemonos in one file
9.  Never use GSAP and Framer on same element
10. Never use MySQL syntax — SQLite only
11. Never put 'use client' anywhere except first line of @arkzen:components blocks
12. Never add comments outside section markers
13. Never change section marker syntax
14. Never use raw fetch on protected API routes — always useQuery, useMutation, or arkzenFetch
15. Never create a second auth store — import useAuthStore from the engine
16. Never use localStorage for auth — useAuthStore handles persistence
17. Never declare foreign keys to tables outside this tatemono (except users.id)
18. Never skip middleware declaration on sensitive routes
19. Never use recharts — use the built-in Chart component
20. Never use react-beautiful-dnd or similar — use the built-in SortableList
21. Never use `layout:` in @arkzen:meta — layout is now per-page
22. Never use the old single @arkzen:page block — always @arkzen:page:name
23. Never use the old single @arkzen:components block — always @arkzen:components:identifier
24. Never use BaseLayout, AuthLayout (old), or BlankLayout — use GuestLayout or AuthLayout (v5 empty layouts)
25. Never declare foreign keys to tables in other tatemonos
```

---

## SECTION 17 — VALIDATION

Before submitting, run:
```bash
node validate.js <tatemono-name>
```

Output example:
```
✓ Valid tatemono: client-portal
  - 4 tables: users, projects, tasks, comments (auto-sorted by FK deps)
  - 4 resources: User, Project, Task, Comment
  - 6 pages: login[guest], register[guest], dashboard[auth], projects[auth], tasks[auth], settings[auth]
  - No warnings
```

---

## SECTION 18 — GENERATION PROMPT TEMPLATE

```
ARKZEN GUIDELINES: [paste this document]

PROJECT STACK:
- Frontend: Next.js 16 + TypeScript + Tailwind CSS + Zustand
- Backend: Laravel 13 + SQLite + Sanctum
- Real-time: Laravel Reverb (if needed)
- Animation: GSAP + Framer Motion (if needed)

REQUIREMENT:
[describe the full system — all features, pages, data it manages]

AUTH: [true | false]
REALTIME: [yes — describe what should be live | no]
BACKGROUND JOBS: [yes — describe | no]

Generate one complete Arkzen Tatemono TSX file.
File name: [system-name]
One file. Every table, every API resource, every page in one Tatemono.
Follow ALL v5 guidelines strictly.
```

---

## SECTION 19 — COMPLETE STRUCTURE REFERENCE v5

```
system-name/core.tsx
│
├── /* @arkzen:meta              → identity, auth (NO layout field)
├── /* @arkzen:config            → OPTIONAL component overrides + layout config
│
├── /* @arkzen:database:table1   → table 1 definition
├── /* @arkzen:database:table2   → table 2 definition  (repeat as needed)
├── /* @arkzen:database:tableN   → table N  (engine auto-sorts by FK deps)
│
├── /* @arkzen:api:resource1     → resource 1 (model + controller + endpoints)
├── /* @arkzen:api:resource2     → resource 2  (repeat as needed)
│
├── /* @arkzen:store:name        → OPTIONAL Zustand stores (repeat with names)
├── /* @arkzen:realtime:name     → OPTIONAL Reverb channels (repeat)
├── /* @arkzen:events:name       → OPTIONAL Laravel events (repeat)
├── /* @arkzen:jobs:name         → OPTIONAL background jobs (repeat)
├── /* @arkzen:notifications:name→ OPTIONAL notifications (repeat)
├── /* @arkzen:mail:name         → OPTIONAL mailables (repeat)
├── /* @arkzen:console:name      → OPTIONAL artisan commands (repeat)
│
├── /* @arkzen:layout:name       → OPTIONAL custom reusable layouts (repeat)
│   └── /* @arkzen:layout:name:end */
│
├── /* @arkzen:components:group1 → imports + interfaces + components group 1
│   └── /* @arkzen:components:group1:end */
├── /* @arkzen:components:group2 → components group 2 (repeat as needed)
│   └── /* @arkzen:components:group2:end */
│
├── /* @arkzen:page:login        → public login page (layout:guest)
│   /* @arkzen:page:layout:guest */
│   └── /* @arkzen:page:login:end */
│
├── /* @arkzen:page:dashboard    → protected dashboard (layout:auth)
│   /* @arkzen:page:layout:auth */
│   └── /* @arkzen:page:dashboard:end */
│
├── /* @arkzen:page:projects     → protected projects page
│   /* @arkzen:page:layout:auth */       (or layout:custom-name)
│   └── /* @arkzen:page:projects:end */
│
└── /* @arkzen:animation         → OPTIONAL GSAP + Framer (once)
    └── /* @arkzen:animation:end */
```

---

## SECTION 20 — SUMMARY: v4 → v5 CHANGES

| Feature | v4 | v5 |
|---------|----|----|
| Pages per tatemono | One page (`@arkzen:page`) | Multiple routes (`@arkzen:page:name`) |
| Layout declaration | `layout:` in meta (global) | `/* @arkzen:page:layout:X */` per page |
| Auth guard | Broken (no login pages) | Works — layout:guest / layout:auth |
| GuestLayout | Didn't exist | Empty public layout (redirect-if-auth) |
| AuthLayout | Hardcoded structure | Empty protected layout (redirect-to-login) |
| BaseLayout | Required | Optional legacy (not for new systems) |
| Component slots | Modal + Dialog + Table only | ALL components have renderX props |
| Repeatable markers | `database`, `api` only | ALL markers repeatable with identifiers |
| `components` marker | Single block | Repeatable: `@arkzen:components:name` |
| Cleanup on delete | Partial (single model guess) | Complete (explicit models/controllers/tables) |
| Migration ordering | Manual (wrong order = crash) | Auto topological sort |
| Forced rules | Must use Tailwind, components | Tailwind required, components optional |
| Validator | None | `node validate.js <name>` |

---

## SECTION 21 — COMPLETE EXAMPLE TATEMONO v5

```tsx
/* @arkzen:meta
name: client-portal
version: 1.0.0
description: Full client portal with projects and auth
auth: true
*/

/* @arkzen:config
toast:
  position: top-right
  duration: 3000
layout:
  guest:
    className: "min-h-screen bg-neutral-50"
  auth:
    className: "min-h-screen bg-white"
*/

/* @arkzen:database:users
table: users
timestamps: true
columns:
  id: { type: integer, primary: true, autoIncrement: true }
  name: { type: string, length: 255, nullable: false }
  email: { type: string, length: 255, unique: true, nullable: false }
  password: { type: string, length: 255, nullable: false }
*/

/* @arkzen:database:projects
table: projects
timestamps: true
columns:
  id: { type: integer, primary: true, autoIncrement: true }
  name: { type: string, length: 255, nullable: false }
  status: { type: string, length: 50, default: active }
  user_id: { type: integer, foreign: users.id, onDelete: cascade }
*/

/* @arkzen:api:auth
model: User
controller: AuthController
prefix: /api/auth
endpoints:
  login:
    method: POST
    route: /login
    validation:
      email: required|email
      password: required|string
    response: { type: single }
  register:
    method: POST
    route: /register
    validation:
      name: required|string|max:255
      email: required|email|unique:users
      password: required|string|min:8|confirmed
    response: { type: single }
  logout:
    method: POST
    route: /logout
    response: { type: message, value: Logged out }
  me:
    method: GET
    route: /me
    response: { type: single }
*/

/* @arkzen:api:projects
model: Project
controller: ProjectController
prefix: /api/projects
middleware: [auth:sanctum]
endpoints:
  index: { method: GET, route: /, description: Get all projects, response: { type: paginated } }
  store: { method: POST, route: /, description: Create project, validation: { name: required|string }, response: { type: single } }
  destroy: { method: DELETE, route: /{id}, description: Delete project, response: { type: message, value: Project deleted } }
*/

/* @arkzen:components:shared */

'use client'

import React, { useState } from 'react'
import { useQuery }        from '@/arkzen/core/hooks/useQuery'
import { useMutation }     from '@/arkzen/core/hooks/useMutation'
import { useAuthStore }    from '@/arkzen/core/stores/authStore'
import { useToast }        from '@/arkzen/core/components/Toast'

interface Project {
  id:     number
  name:   string
  status: string
}

/* @arkzen:components:shared:end */

/* @arkzen:components:projects */

'use client'

import React from 'react'

const ProjectCard = ({ project, onDelete }: { project: Project; onDelete: () => void }) => (
  <div className="arkzen-card p-4 flex items-center justify-between">
    <div>
      <h3 className="font-semibold">{project.name}</h3>
      <span className={`text-xs px-2 py-0.5 rounded-full ${project.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
        {project.status}
      </span>
    </div>
    <button onClick={onDelete} className="arkzen-btn-danger text-sm px-3 py-1.5">Delete</button>
  </div>
)

/* @arkzen:components:projects:end */

/* @arkzen:page:login */
/* @arkzen:page:layout:guest */
const LoginPage = () => {
  const { login, isLoading } = useAuthStore()
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-black/5 p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <h1 className="text-xl font-semibold">Client Portal</h1>
          <p className="text-sm text-neutral-500 mt-1">Sign in to your account</p>
        </div>
        <div className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="arkzen-input w-full" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="arkzen-input w-full" />
          <button onClick={() => login(email, password)} disabled={isLoading} className="arkzen-btn-primary w-full">
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>
        <p className="text-center text-sm text-neutral-500 mt-6">
          No account? <a href="/client-portal/register" className="text-neutral-900 font-medium hover:underline">Register</a>
        </p>
      </div>
    </div>
  )
}
/* @arkzen:page:login:end */

/* @arkzen:page:register */
/* @arkzen:page:layout:guest */
const RegisterPage = () => {
  const { register, isLoading } = useAuthStore()
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-black/5 p-8">
        <h1 className="text-xl font-semibold mb-6 text-center">Create Account</h1>
        <div className="space-y-4">
          <input type="text"     placeholder="Full Name"        value={name}     onChange={e => setName(e.target.value)}     className="arkzen-input w-full" />
          <input type="email"    placeholder="Email"            value={email}    onChange={e => setEmail(e.target.value)}    className="arkzen-input w-full" />
          <input type="password" placeholder="Password"         value={password} onChange={e => setPassword(e.target.value)} className="arkzen-input w-full" />
          <input type="password" placeholder="Confirm Password" value={confirm}  onChange={e => setConfirm(e.target.value)}  className="arkzen-input w-full" />
          <button onClick={() => register(name, email, password, confirm)} disabled={isLoading} className="arkzen-btn-primary w-full">
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </div>
        <p className="text-center text-sm text-neutral-500 mt-6">
          Have an account? <a href="/client-portal/login" className="text-neutral-900 font-medium hover:underline">Sign In</a>
        </p>
      </div>
    </div>
  )
}
/* @arkzen:page:register:end */

/* @arkzen:page:dashboard */
/* @arkzen:page:layout:auth */
const DashboardPage = () => {
  const { user, logout }                  = useAuthStore()
  const { toast }                          = useToast()
  const { data: projectData, isLoading }   = useQuery<{ data: Project[] }>('/api/projects')
  const projects                           = projectData?.data ?? []

  const { mutate: deleteProject } = useMutation<unknown, unknown>({
    method:     'DELETE',
    invalidates: ['/api/projects'],
    onSuccess:  () => toast.success('Project deleted'),
    onError:    (err) => toast.error(String(err)),
  })

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-neutral-200 flex flex-col p-4">
        <div className="mb-6">
          <h2 className="font-bold text-lg">Client Portal</h2>
        </div>
        <nav className="flex-1 space-y-1">
          <a href="/client-portal/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900 text-white text-sm">Dashboard</a>
          <a href="/client-portal/projects"  className="flex items-center gap-2 px-3 py-2 rounded-xl text-neutral-600 hover:bg-neutral-100 text-sm">Projects</a>
        </nav>
        <div className="pt-4 border-t border-neutral-200">
          <p className="text-sm text-neutral-500 mb-2">{user?.name}</p>
          <button onClick={logout} className="text-xs text-neutral-400 hover:text-neutral-700">Sign out</button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="arkzen-card p-4">
            <p className="text-sm text-neutral-500">Total Projects</p>
            <p className="text-3xl font-bold mt-1">{projects.length}</p>
          </div>
          <div className="arkzen-card p-4">
            <p className="text-sm text-neutral-500">Active</p>
            <p className="text-3xl font-bold mt-1">{projects.filter(p => p.status === 'active').length}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
/* @arkzen:page:dashboard:end */

/* @arkzen:page:projects */
/* @arkzen:page:layout:auth */
const ProjectsPage = () => {
  const { toast }                        = useToast()
  const { data, isLoading, refetch }     = useQuery<{ data: Project[] }>('/api/projects')
  const projects                          = data?.data ?? []
  const [newName, setNewName]             = useState('')

  const { mutate: createProject, isLoading: creating } = useMutation<unknown, { name: string }>({
    method:     'POST',
    invalidates: ['/api/projects'],
    onSuccess:  () => { toast.success('Project created'); setNewName('') },
    onError:    (err) => toast.error(String(err)),
  })

  const { mutate: deleteProject } = useMutation<unknown, unknown>({
    method:     'DELETE',
    invalidates: ['/api/projects'],
    onSuccess:  () => toast.success('Project deleted'),
  })

  return (
    <div className="flex h-screen bg-neutral-50">
      <aside className="w-60 bg-white border-r border-neutral-200 flex flex-col p-4">
        <div className="mb-6"><h2 className="font-bold text-lg">Client Portal</h2></div>
        <nav className="flex-1 space-y-1">
          <a href="/client-portal/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-xl text-neutral-600 hover:bg-neutral-100 text-sm">Dashboard</a>
          <a href="/client-portal/projects"  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900 text-white text-sm">Projects</a>
        </nav>
      </aside>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Projects</h1>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New project name..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="arkzen-input"
            />
            <button
              onClick={() => createProject('/api/projects', { name: newName })}
              disabled={!newName || creating}
              className="arkzen-btn-primary"
            >
              {creating ? 'Creating...' : 'Add Project'}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-20 bg-neutral-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {projects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={() => deleteProject(`/api/projects/${project.id}`, {})}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
/* @arkzen:page:projects:end */

/* @arkzen:animation */
import { gsap } from 'gsap'
import React from 'react'

const clientPortalAnimations = (pageRef: React.RefObject<HTMLDivElement>) => {
  const ctx = gsap.context(() => {
    gsap.fromTo('.arkzen-card',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.05 }
    )
  }, pageRef)
  return () => ctx.revert()
}

export const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.2 } },
}
/* @arkzen:animation:end */
```
