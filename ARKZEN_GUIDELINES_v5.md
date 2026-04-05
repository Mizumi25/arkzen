# ARKZEN GUIDELINES DOCUMENT v5.9
## For Claude AI — Generating Tatemono Files

---

## SECTION 1 — WHAT IS ARKZEN

Arkzen is a full stack scaffolding engine built on Next.js TypeScript and Laravel. It uses a single file format called a **Tatemono** to define an entire system — multiple database tables, multiple backend API resources, middleware, multiple frontend pages and components, multiple stores, real-time channels, background jobs, notifications, events, and animations — all in one file.

**One Tatemono = one complete, fully isolated client system.**

Each Tatemono is its own world. It does not share anything with other Tatemonos. No shared auth, no shared components, no shared stores. Every Tatemono stands alone.

The engine is a **distribution tool**. It does NOT control or limit. The user controls everything. The engine just distributes the user's instructions to the right places.

**Stack:**
- Frontend: Next.js 16 + TypeScript + **Tailwind CSS** (required) + Zustand
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

---

## SECTION 3 — TATEMONO FILE RULES

```
1. One Tatemono = one complete isolated system
2. File extension is always .tsx
3. File lives at: tatemonos/<name>/core.tsx
4. Tatemono name is always lowercase with hyphens
   CORRECT:   pos-system
   CORRECT:   project-management
   WRONG:     PosSystem

5. Sections declared with @arkzen markers
6. Sections must appear in this EXACT order:
   @arkzen:meta                     (once)
   @arkzen:config                   (optional, once)
   @arkzen:database:identifier      (REPEAT — one per table)
   @arkzen:api:identifier           (REPEAT — one per resource group)
   @arkzen:store:identifier         (optional, REPEAT)
   @arkzen:realtime:identifier      (optional, REPEAT)
   @arkzen:events:identifier        (optional, REPEAT)
   @arkzen:jobs:identifier          (optional, REPEAT)
   @arkzen:notifications:identifier (optional, REPEAT)
   @arkzen:mail:identifier          (optional, REPEAT)
   @arkzen:console:identifier       (optional, REPEAT)
   @arkzen:layout:name              (optional, REPEAT — custom layouts)
   @arkzen:components:identifier    (REPEAT — one per group)
   @arkzen:page:name                (REPEAT — one per page/route)
   @arkzen:animation                (optional, once)

7. Everything is TypeScript strictly typed — no 'any'
8. All imports go inside @arkzen:components blocks
9. Each Tatemono is a fully self-contained isolated system
10. Tatemonos do NOT share anything with each other
```

---

## SECTION 4 — AUTH RULES (CRITICAL)

**Auth is opt-in per Tatemono. Most Tatemonos do NOT use auth.**

```
auth: false  → No login/register pages. No useAuthStore. No GuestLayout/AuthLayout.
              All pages use layout:guest. Routes are fully public.

auth: true   → Has login and/or register pages (layout:guest).
              Has protected pages (layout:auth).
              Must call setActiveTatemono('<tatemono-name>') in @arkzen:components.
              Must import useAuthStore from '@/arkzen/core/stores/authStore'.
```

**RULE: Only generate auth pages (login, register) if `auth: true` is explicitly set.**

When `auth: false`:
- Do NOT generate a login page
- Do NOT generate a register page
- Do NOT import or use `useAuthStore`
- Do NOT use `layout:auth` on any page
- All pages use `layout:guest`
- Use `arkzenFetch` only if the Tatemono needs to call its own public API

When `auth: true`:
- You MUST call `setActiveTatemono('<name>')` once in the first `@arkzen:components` block:
  ```tsx
  import { useAuthStore, setActiveTatemono } from '@/arkzen/core/stores/authStore'
  if (typeof window !== 'undefined') {
    setActiveTatemono('your-tatemono-name')
  }
  ```
- This scopes all auth API calls to `/api/<tatemono-name>/auth/*`
- Login page → `layout:guest`
- Register page → `layout:guest`
- Protected pages → `layout:auth`

**Auth Redirect Behavior (when auth: true):**
- Unauthenticated user visits `layout:auth` page → redirect to login
- Authenticated user visits `layout:guest` page → redirect to first `layout:auth` page

---

## SECTION 5 — @arkzen:meta

```tsx
/* @arkzen:meta
name: pos-system
version: 1.0.0
description: Full point-of-sale system
auth: false
dependencies: []
*/
```

**Fields:**
- `name` — required. kebab-case. Must match folder name.
- `version` — optional. Defaults to 1.0.0.
- `description` — optional. Human-readable description.
- `auth` — required. `true` or `false`. See Section 4.
- `dependencies` — optional. Always empty — Tatemonos are isolated.

**NOTE: `layout` field does NOT exist in meta. Layout is declared per-page.**

---

## SECTION 6 — @arkzen:config (optional, once)

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
    className: "min-h-screen bg-neutral-50"
  auth:
    className: "min-h-screen bg-white"
*/
```

---

## SECTION 7 — @arkzen:database (REPEAT — identifier required)

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
```

**Column types:** `integer, bigInteger, string, text, longText, decimal, float, boolean, date, datetime, timestamp, json, uuid`

**Rules:**
```
1. Identifier after @arkzen:database: must match table name concept
2. Table name always plural snake_case
3. Foreign keys reference table.column within same Tatemono ONLY
4. Exception: users.id is allowed for auth:true Tatemonos
5. Seeder is optional per table
6. softDeletes: true adds deleted_at
7. Engine auto-sorts migrations by foreign key dependency
```

---

## SECTION 8 — @arkzen:api (REPEAT — identifier required)

One block per model/controller pair.

```tsx
/* @arkzen:api:products
model: Product
controller: ProductController
prefix: /api/products
middleware: [throttle:60,1]
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
[]                          → public, no auth
[throttle:60,1]             → rate limit only, no auth
[auth:sanctum]              → Sanctum token required
[auth:sanctum, throttle:60,1] → auth + rate limit
[auth:sanctum, role:admin]  → auth + admin role only
```

**RULE: Only use `auth:sanctum` in middleware if `auth: true` in meta.**

**Optional flags per @arkzen:api block:**
```
resource: true   → generates API Resource class
policy: true     → generates Policy class
factory: true    → generates Model Factory
```

---

## SECTION 9 — @arkzen:store (REPEAT — identifier required)

```tsx
/* @arkzen:store:pos */

import { create } from 'zustand'

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

---

## SECTION 10 — @arkzen:realtime (REPEAT — identifier required)

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

## SECTION 11 — @arkzen:events (REPEAT — identifier required)

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

## SECTION 12 — @arkzen:jobs, @arkzen:notifications, @arkzen:mail, @arkzen:console

All REPEAT with identifiers:

```tsx
/* @arkzen:jobs:email
send-welcome-email:
  queue: emails
  tries: 3
  timeout: 120
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
*/
```

---

## SECTION 13 — LAYOUT SYSTEM

### Two Base Layouts

| Layout  | Type      | Guard |
|---------|-----------|-------|
| `guest` | Public    | Redirects logged-in users away (only if `auth: true` in meta) |
| `auth`  | Protected | Redirects unauthenticated users to login (only if `auth: true` in meta) |

**Both layouts are EMPTY. No sidebar, no topbar. You build your own structure inside each page.**

**RULE: If `auth: false`, ALL pages use `layout:guest`. No `layout:auth` ever.**

Each page declares its layout using `/* @arkzen:page:layout:X */` inside the page block.

### Custom Layouts

Define reusable layouts for shared structure within the same Tatemono:

```tsx
/* @arkzen:layout:dashboard-layout */
export const DashboardLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-screen bg-neutral-50">
    <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col">
      <nav className="p-4">...</nav>
    </aside>
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="h-16 bg-white border-b border-neutral-200 px-6 flex items-center">
        ...
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

## SECTION 14 — @arkzen:components (REPEAT — identifier required)

All imports MUST go here. Custom components for this system go here.
Split by logical grouping — one block per section of the system.

```tsx
/* @arkzen:components:shared */

'use client'

import React, { useState, useEffect } from 'react'
import { Package, Plus, Trash2 } from 'lucide-react'
import { Modal }       from '@/arkzen/core/components/Modal'
import { Table }       from '@/arkzen/core/components/Table'
import { useToast }    from '@/arkzen/core/components/Toast'
import { useQuery }    from '@/arkzen/core/hooks/useQuery'
import { useMutation } from '@/arkzen/core/hooks/useMutation'

// Only import if auth: true in meta:
// import { useAuthStore, setActiveTatemono } from '@/arkzen/core/stores/authStore'
// if (typeof window !== 'undefined') { setActiveTatemono('your-tatemono-name') }

// TypeScript interfaces
interface Product {
  id:    number
  name:  string
  price: number
  stock: number
}

/* @arkzen:components:shared:end */
```

**Available engine imports:**
```
Components:
  @/arkzen/core/components/Modal        (renderHeader, renderBody, renderFooter)
  @/arkzen/core/components/Drawer
  @/arkzen/core/components/Dialog       (renderIcon, renderContent, renderActions)
  @/arkzen/core/components/Table        (renderRow, renderHead, renderEmpty, renderToolbar)
  @/arkzen/core/components/Toast        → also: useToast hook
  @/arkzen/core/components/Pagination
  @/arkzen/core/components/Breadcrumb
  @/arkzen/core/components/Loading
  @/arkzen/core/components/EmptyState
  @/arkzen/core/components/SortableList
  @/arkzen/core/components/Chart        (line, bar, area, donut — SVG)
  @/arkzen/core/components/FileUpload
  @/arkzen/core/components/RichTextEditor (TipTap wrapper)
  @/arkzen/core/components/Map          (Leaflet wrapper)
  @/arkzen/core/components/utils        (Badge, Avatar, Tooltip, Field, Form)

Hooks:
  @/arkzen/core/hooks/useQuery     (GET fetch + cache + retry)
  @/arkzen/core/hooks/useMutation  (POST/PUT/DELETE + optimistic)
  @/arkzen/core/hooks/useWebSocket (Reverb connection)
  @/arkzen/core/hooks/useCRDT     (conflict resolution)

Auth (only when auth: true):
  @/arkzen/core/stores/authStore   (useAuthStore, arkzenFetch, setActiveTatemono)

Fetching for public APIs (auth: false):
  arkzenFetch from '@/arkzen/core/stores/authStore'  ← still usable without auth
```

---

## SECTION 15 — @arkzen:page (REPEAT — name required)

Each page is its own route: `/{tatemono-name}/{page-name}`
Special case: page named `index` → `/{tatemono-name}` (no subfolder)

```tsx
/* @arkzen:page:dashboard */
/* @arkzen:page:layout:guest */
const DashboardPage = () => {
  return (
    <div className="arkzen-container">
      <h1 className="text-2xl font-bold">Dashboard</h1>
    </div>
  )
}
/* @arkzen:page:dashboard:end */
```

**Rules:**
```
1. Page name: kebab-case (e.g. page:dashboard, page:project-detail)
2. Layout declared inside page block on its own line immediately after opening marker
3. Default layout is auth if not declared — always declare explicitly
4. Component name: PascalCase + Page (e.g. DashboardPage, LoginPage)
5. Use useQuery for GET requests
6. Use useMutation for POST/PUT/DELETE
7. Do NOT export — engine handles it
8. At least one page required per Tatemono
9. auth: false → all pages must use layout:guest
10. auth: true → login/register use layout:guest, protected pages use layout:auth
```

**Generated routes:**
```
/{tatemono-name}            → page named "index"
/{tatemono-name}/dashboard  → page named "dashboard"
/{tatemono-name}/login      → page named "login" (auth:true only)
```

**Utility classes:**
```
arkzen-container      → max-w-7xl mx-auto px-6 py-8
arkzen-card           → bg-white rounded-2xl border border-neutral-200
arkzen-input          → styled input field
arkzen-btn-primary    → dark filled button
arkzen-btn-secondary  → outlined button
arkzen-btn-danger     → red button
arkzen-btn-ghost      → ghost/text button
arkzen-btn            → default button
```

---

## SECTION 16 — @arkzen:animation (optional, once)

```tsx
/* @arkzen:animation */

import { gsap } from 'gsap'
import React from 'react'

const mySystemAnimations = (pageRef: React.RefObject<HTMLDivElement>) => {
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

## SECTION 17 — WHAT AI MUST NEVER DO

```
1.  Never generate incomplete sections
2.  Never skip @arkzen:components or @arkzen:page sections
3.  Never use 'any' TypeScript type
4.  Never export components or pages manually
5.  Never put imports outside @arkzen:components blocks
6.  Never use non-Tailwind CSS as the primary styling approach
7.  Never use class components — hooks only
8.  Never generate two Tatemonos in one file
9.  Never use GSAP and Framer on same element
10. Never use MySQL syntax — SQLite only
11. Never put 'use client' anywhere except first line of @arkzen:components blocks
12. Never add comments outside section markers
13. Never change section marker syntax
14. Never use raw fetch on API routes — always useQuery, useMutation, or arkzenFetch
15. Never create a second auth store — import useAuthStore from the engine
16. Never use localStorage for auth — useAuthStore handles persistence
17. Never declare foreign keys to tables in other Tatemonos (except users.id when auth:true)
18. Never skip middleware declaration on sensitive routes
19. Never use recharts — use the built-in Chart component
20. Never use react-beautiful-dnd — use the built-in SortableList
21. Never use `layout:` in @arkzen:meta — layout is per-page
22. Never use the old single @arkzen:page block — always @arkzen:page:name
23. Never use the old single @arkzen:components block — always @arkzen:components:identifier
24. Never generate login or register pages when auth: false
25. Never use useAuthStore when auth: false (arkzenFetch alone is fine for public APIs)
26. Never call setActiveTatemono when auth: false
27. Never use layout:auth when auth: false
28. Never share components, stores, or types between Tatemonos
29. Never use middleware: [auth:sanctum] when auth: false
```

---

## SECTION 18 — VALIDATION

Before submitting, run:
```bash
node validate.js <tatemono-name>
```

Output example:
```
✓ Valid tatemono: inventory-management
  - 1 table: inventories
  - 1 resource: Inventory
  - 1 page: index[guest]
  - auth: false
  - No warnings
```

---

## SECTION 19 — GENERATION PROMPT TEMPLATE

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
  If true — Tatemono has its own login/register flow.
  If false — No auth pages. All pages public.

REALTIME: [yes — describe what should be live | no]
BACKGROUND JOBS: [yes — describe | no]

Generate one complete Arkzen Tatemono TSX file.
File name: [system-name]
One file. Every table, every API resource, every page in one Tatemono.
Follow ALL v5.9 guidelines strictly.
```

---

## SECTION 20 — COMPLETE STRUCTURE REFERENCE v5.9

```
tatemonos/<name>/core.tsx
│
├── /* @arkzen:meta              → identity, auth: true|false
├── /* @arkzen:config            → OPTIONAL component overrides + layout config
│
├── /* @arkzen:database:table1   → table 1 definition
├── /* @arkzen:database:table2   → table 2 definition  (repeat as needed)
│
├── /* @arkzen:api:resource1     → resource 1 (model + controller + endpoints)
├── /* @arkzen:api:resource2     → resource 2  (repeat as needed)
│
├── /* @arkzen:store:name        → OPTIONAL Zustand stores (repeat)
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
├── /* @arkzen:components:group1 → 'use client' + imports + interfaces + components
│   └── /* @arkzen:components:group1:end */
├── /* @arkzen:components:group2 → additional components (repeat as needed)
│   └── /* @arkzen:components:group2:end */
│
│   ── auth: false Tatemono ──────────────────────────────────
├── /* @arkzen:page:index        → public index page
│   /* @arkzen:page:layout:guest */
│   └── /* @arkzen:page:index:end */
│
├── /* @arkzen:page:dashboard    → another public page
│   /* @arkzen:page:layout:guest */
│   └── /* @arkzen:page:dashboard:end */
│
│   ── auth: true Tatemono ──────────────────────────────────
├── /* @arkzen:page:register     → public register page
│   /* @arkzen:page:layout:guest */
│   └── /* @arkzen:page:register:end */
│
├── /* @arkzen:page:login        → public login page
│   /* @arkzen:page:layout:guest */
│   └── /* @arkzen:page:login:end */
│
├── /* @arkzen:page:dashboard    → protected dashboard
│   /* @arkzen:page:layout:auth */
│   └── /* @arkzen:page:dashboard:end */
│
└── /* @arkzen:animation         → OPTIONAL GSAP + Framer (once)
    └── /* @arkzen:animation:end */
```

---

## SECTION 21 — v5.0 → v5.9 CHANGES

| Feature | v5.0 | v5.9 |
|---------|------|------|
| Auth scope | Global auth concept, unclear isolation | Per-Tatemono, fully isolated |
| `setActiveTatemono` | Existed but not documented in guidelines | Documented, required for `auth: true` |
| Login/register pages | Generated regardless of auth setting | Only generated when `auth: true` |
| `useAuthStore` usage | Could appear in any Tatemono | Only for `auth: true` Tatemonos |
| Tatemono isolation | Mentioned but not enforced in guidelines | Explicitly enforced — nothing shared |
| Public API fetching | Unclear how to call APIs without auth | `arkzenFetch` usable for public routes |
| `layout:auth` on `auth:false` | Could happen accidentally | Explicitly forbidden |
| middleware: [auth:sanctum] | Could appear without auth meta | Forbidden when `auth: false` |

---

## SECTION 22 — COMPLETE EXAMPLE: auth:false Tatemono

```tsx
/* @arkzen:meta
name: inventory-management
version: 2.0.0
description: Full inventory management with stock tracking
auth: false
dependencies: []
*/

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
*/

/* @arkzen:database:inventories
table: inventories
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
  quantity:
    type: integer
    default: 0
    nullable: false
  price:
    type: decimal
    precision: 10
    scale: 2
    nullable: false
  category:
    type: string
    length: 100
    nullable: true
seeder:
  count: 3
  data:
    - name: Sample Item
      sku: SKU-001
      quantity: 50
      price: 99.99
      category: General
*/

/* @arkzen:api:inventories
model: Inventory
controller: InventoryController
prefix: /api/inventories
middleware: []
endpoints:
  index:
    method: GET
    route: /
    response:
      type: paginated
  store:
    method: POST
    route: /
    validation:
      name: required|string|max:255
      sku: required|string|unique:inventories
      quantity: required|integer|min:0
      price: required|numeric|min:0
    response:
      type: single
  update:
    method: PUT
    route: /{id}
    response:
      type: single
  destroy:
    method: DELETE
    route: /{id}
    response:
      type: message
      value: Item deleted
*/

/* @arkzen:components:shared */

'use client'

import React, { useState } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { Modal }       from '@/arkzen/core/components/Modal'
import { Dialog }      from '@/arkzen/core/components/Dialog'
import { useToast }    from '@/arkzen/core/components/Toast'
import { useQuery }    from '@/arkzen/core/hooks/useQuery'
import { useMutation } from '@/arkzen/core/hooks/useMutation'

interface InventoryItem {
  id:       number
  name:     string
  sku:      string
  quantity: number
  price:    number
  category: string | null
}

/* @arkzen:components:shared:end */

/* @arkzen:page:index */
/* @arkzen:page:layout:guest */
const IndexPage = () => {
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<InventoryItem | null>(null)
  const [form, setForm]           = useState({ name: '', sku: '', quantity: '0', price: '0', category: '' })

  const { data, refetch } = useQuery<{ data: InventoryItem[] }>('/api/inventories')
  const items = data?.data ?? []

  const { mutate: save, isLoading: saving } = useMutation({
    method:     editing ? 'PUT' : 'POST',
    invalidates: ['/api/inventories'],
    onSuccess:  () => { toast.success(editing ? 'Updated' : 'Created'); setModalOpen(false); refetch() },
    onError:    () => toast.error('Failed to save'),
  })

  const { mutate: remove } = useMutation({
    method:     'DELETE',
    invalidates: ['/api/inventories'],
    onSuccess:  () => { toast.success('Deleted'); refetch() },
  })

  const openCreate = () => { setEditing(null); setForm({ name: '', sku: '', quantity: '0', price: '0', category: '' }); setModalOpen(true) }
  const openEdit   = (item: InventoryItem) => {
    setEditing(item)
    setForm({ name: item.name, sku: item.sku, quantity: String(item.quantity), price: String(item.price), category: item.category ?? '' })
    setModalOpen(true)
  }

  return (
    <div className="arkzen-container">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Inventory</h1>
        <button onClick={openCreate} className="arkzen-btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Item
        </button>
      </div>

      <div className="arkzen-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-100">
            <tr>
              {['Name', 'SKU', 'Qty', 'Price', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-neutral-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                <td className="px-4 py-3 font-medium">{item.name}</td>
                <td className="px-4 py-3 font-mono text-neutral-500">{item.sku}</td>
                <td className="px-4 py-3">{item.quantity}</td>
                <td className="px-4 py-3">${Number(item.price).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-neutral-100"><Edit2 size={14} /></button>
                    <button onClick={() => remove(`/api/inventories/${item.id}`, {})} className="p-1.5 rounded hover:bg-red-50 text-red-400"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Item' : 'Add Item'}
        renderFooter={(onClose) => (
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="arkzen-btn-secondary flex-1">Cancel</button>
            <button onClick={() => save(editing ? `/api/inventories/${editing.id}` : '/api/inventories', { ...form, quantity: parseInt(form.quantity), price: parseFloat(form.price) })} disabled={saving} className="arkzen-btn-primary flex-1">
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </button>
          </div>
        )}
      >
        <div className="space-y-3">
          <input className="arkzen-input w-full" placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input className="arkzen-input w-full" placeholder="SKU" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} disabled={!!editing} />
          <input className="arkzen-input w-full" type="number" placeholder="Quantity" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
          <input className="arkzen-input w-full" type="number" placeholder="Price" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
          <input className="arkzen-input w-full" placeholder="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
        </div>
      </Modal>
    </div>
  )
}
/* @arkzen:page:index:end */
```

---

## SECTION 23 — COMPLETE EXAMPLE: auth:true Tatemono

```tsx
/* @arkzen:meta
name: auth-test
version: 1.0.0
description: 3-page auth tatemono — register, login, dashboard
auth: true
*/

/* @arkzen:config
toast:
  position: top-right
  duration: 4000
layout:
  guest:
    className: "min-h-screen bg-neutral-50"
  auth:
    className: "min-h-screen bg-white"
*/

// ─────────────────────────────────────────────────────────────────
// Auth notes for auth: true Tatemonos:
//
// NO database:users — users table is managed by Laravel setup.
// NO api:auth — login/register/logout/me are built-in:
//   login(email, password)                    → POST /api/<name>/auth/login
//   register(name, email, password, confirm)  → POST /api/<name>/auth/register
//   logout()                                  → POST /api/<name>/auth/logout
//   user                                      ← current user object
//   isAuthenticated                           ← boolean
//
// setActiveTatemono('<name>') MUST be called once — it scopes all
// auth API calls to the correct tatemono slug.
//
// layout:guest pages auto-redirect logged-in users to first layout:auth page.
// layout:auth  pages auto-redirect guests to login page.
// ─────────────────────────────────────────────────────────────────

/* @arkzen:components:shared */

'use client'

import React, { useState } from 'react'
import { useAuthStore, setActiveTatemono } from '@/arkzen/core/stores/authStore'

if (typeof window !== 'undefined') {
  setActiveTatemono('auth-test')
}

/* @arkzen:components:shared:end */

/* @arkzen:page:register */
/* @arkzen:page:layout:guest */
const RegisterPage = () => {
  // ... register form using useAuthStore().register
}
/* @arkzen:page:register:end */

/* @arkzen:page:login */
/* @arkzen:page:layout:guest */
const LoginPage = () => {
  // ... login form using useAuthStore().login
}
/* @arkzen:page:login:end */

/* @arkzen:page:dashboard */
/* @arkzen:page:layout:auth */
const DashboardPage = () => {
  // ... protected page using useAuthStore().user, logout
}
/* @arkzen:page:dashboard:end */
```