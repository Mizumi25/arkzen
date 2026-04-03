# ARKZEN GUIDELINES DOCUMENT v4.0
## For Claude AI — Generating Tatemono Files

---

## SECTION 1 — WHAT IS ARKZEN

Arkzen is a full stack scaffolding engine built on Next.js TypeScript and Laravel. It uses a single file format called a **Tatemono** to define an entire system — multiple database tables, multiple backend API resources, middleware, frontend pages and components, global store, real-time channels, background jobs, notifications, events, and animations — all in one file.

**One Tatemono = one complete client system.**

Your job as AI is to generate one complete valid Tatemono TSX file based on the requirements given. The Arkzen Engine reads this file and automatically builds everything.

**Stack:**
- Frontend: Next.js 16 + TypeScript + Tailwind CSS + Zustand
- Backend: Laravel 13 + SQLite + Laravel Sanctum
- Real-time: Laravel Reverb + custom CRDT
- Animation: GSAP + Framer Motion
- Icons: Lucide React + Hero Icons
- Optional: Matter.js, Three.js, TipTap, Leaflet

---

## SECTION 2 — TATEMONO FILE RULES

```
1. One Tatemono = one complete system (multiple tables, pages, API resources)
2. File extension is always .tsx
3. File name is always lowercase with hyphens
   CORRECT:   pos-system
   CORRECT:   project-management
   WRONG:     PosSystem

4. Sections declared with @arkzen markers
5. Sections must appear in this EXACT order:
   @arkzen:meta           (once)
   @arkzen:config         (optional, once)
   @arkzen:database       (REPEAT for each table)
   @arkzen:api            (REPEAT for each resource group)
   @arkzen:store          (optional, once)
   @arkzen:realtime       (optional, once — Reverb + CRDT)
   @arkzen:events         (optional, once — Laravel events)
   @arkzen:jobs           (optional, once — background jobs)
   @arkzen:notifications  (optional, once — notifications)
   @arkzen:mail           (optional, once — mailables)
   @arkzen:console        (optional, once — artisan commands)
   @arkzen:components     (once)
   @arkzen:page           (once)
   @arkzen:animation      (optional, once)

6. @arkzen:database and @arkzen:api REPEAT — one block per table/resource
7. Everything is TypeScript strictly typed — no 'any'
8. All imports go inside @arkzen:components
9. Each tatemono is a self-contained system
```

---

## SECTION 3 — @arkzen:meta

```tsx
/* @arkzen:meta
name: pos-system
version: 1.0.0
description: Full point-of-sale system with products, orders, and inventory
layout: base
auth: true
dependencies: []
*/
```

---

## SECTION 4 — @arkzen:config (optional, once)

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
*/
```

---

## SECTION 5 — @arkzen:database (REPEAT FOR EACH TABLE)

Declare one block per table. The engine processes all of them.

```tsx
/* @arkzen:database
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

/* @arkzen:database
table: orders
timestamps: true
softDeletes: false

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
  notes:
    type: text
    nullable: true
*/

/* @arkzen:database
table: order_items
timestamps: true
softDeletes: false

columns:
  id:
    type: integer
    primary: true
    autoIncrement: true
  order_id:
    type: integer
    foreign: orders.id
    onDelete: cascade
    nullable: false
  product_id:
    type: integer
    foreign: products.id
    onDelete: cascade
    nullable: false
  quantity:
    type: integer
    nullable: false
  unit_price:
    type: decimal
    precision: 10
    scale: 2
    nullable: false
*/
```

**Column types:** `integer, bigInteger, string, text, longText, decimal, float, boolean, date, datetime, timestamp, json, uuid`

**Rules:**
```
1. Table name always plural snake_case
2. Foreign keys reference table.column (within same tatemono or users table)
3. Seeder is optional per table
4. softDeletes: true adds deleted_at
```

---

## SECTION 6 — @arkzen:api (REPEAT FOR EACH RESOURCE)

One block per model/controller pair.

```tsx
/* @arkzen:api
model: Product
controller: ProductController
prefix: /api/products
middleware: [auth, throttle:60,1]
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
      category_id: integer|optional
    response:
      type: paginated

  show:
    method: GET
    route: /{id}
    description: Get single product
    response:
      type: single

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
      stock: sometimes|integer|min:0
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

/* @arkzen:api
model: Order
controller: OrderController
prefix: /api/orders
middleware: [auth]
resource: true
policy: true

endpoints:
  index:
    method: GET
    route: /
    description: Get paginated orders
    query:
      status: string|optional
      per_page: integer|default:15
    response:
      type: paginated

  store:
    method: POST
    route: /
    description: Create order
    validation:
      total: required|numeric|min:0
      notes: nullable|string
    response:
      type: single

  destroy:
    method: DELETE
    route: /{id}
    description: Cancel order
    response:
      type: message
      value: Order cancelled
*/
```

**Middleware options:**
```
[]                      → public
[auth]                  → Sanctum token required
[auth, throttle:60,1]   → auth + 60 req/min
[auth, role:admin]      → auth + admin role only
[throttle:30,1]         → rate limit, no auth
```

**Optional flags per @arkzen:api block:**
```
resource: true   → generates API Resource class (transforms output)
policy: true     → generates Policy class (owner/admin authorization)
factory: true    → generates Model Factory (fake data for testing)
```

---

## SECTION 7 — @arkzen:store (optional, once)

Add when the system needs shared state across multiple pages/components.

```tsx
/* @arkzen:store */

import { create } from 'zustand'
import { arkzenFetch } from '@/arkzen/core/stores/authStore'

interface PosState {
  products:    Product[]
  cart:        CartItem[]
  isLoading:   boolean

  fetchProducts: () => Promise<void>
  addToCart:     (product: Product, qty: number) => void
  removeFromCart:(id: number) => void
  clearCart:     () => void
  checkout:      () => Promise<void>
}

const usePosStore = create<PosState>((set, get) => ({
  products:  [],
  cart:      [],
  isLoading: false,

  fetchProducts: async () => {
    set({ isLoading: true })
    try {
      const res  = await arkzenFetch('/api/products?per_page=100')
      const data = await res.json()
      set({ products: data.data ?? [] })
    } finally {
      set({ isLoading: false })
    }
  },

  addToCart: (product, qty) => set(s => {
    const existing = s.cart.find(i => i.product.id === product.id)
    if (existing) {
      return { cart: s.cart.map(i => i.product.id === product.id ? { ...i, qty: i.qty + qty } : i) }
    }
    return { cart: [...s.cart, { product, qty }] }
  }),

  removeFromCart: (id) => set(s => ({ cart: s.cart.filter(i => i.product.id !== id) })),
  clearCart:      ()   => set({ cart: [] }),

  checkout: async () => {
    const { cart } = get()
    const total = cart.reduce((s, i) => s + i.product.price * i.qty, 0)
    await arkzenFetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ total, items: cart }),
    })
    get().clearCart()
  },
}))

/* @arkzen:store:end */
```

---

## SECTION 8 — @arkzen:realtime (optional, once)

Declares Reverb channels and CRDT-enabled data.

```tsx
/* @arkzen:realtime
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
  stock-updated:
    channel: pos-floor
    type: presence
*/
```

---

## SECTION 9 — @arkzen:events (optional, once)

```tsx
/* @arkzen:events
order-placed:
  listeners: [SendOrderConfirmation, UpdateProductStock, NotifyKitchen]
product-stock-low:
  listeners: [NotifyManager, CreateRestockJob]
*/
```

---

## SECTION 10 — @arkzen:jobs (optional, once)

```tsx
/* @arkzen:jobs
process-order:
  queue: orders
  tries: 3
  timeout: 120
generate-daily-report:
  queue: reports
  tries: 1
  timeout: 300
  schedule: daily
*/
```

---

## SECTION 11 — @arkzen:notifications (optional, once)

```tsx
/* @arkzen:notifications
order-confirmed:
  channels: [database, mail]
  message: Your order has been confirmed
  subject: Order Confirmation
stock-alert:
  channels: [database]
  message: A product is running low on stock
*/
```

---

## SECTION 12 — @arkzen:mail (optional, once)

```tsx
/* @arkzen:mail
order-receipt:
  subject: Your Order Receipt
  data:
    order_number: string
    total: string
    customer_name: string
*/
```

---

## SECTION 13 — @arkzen:console (optional, once)

```tsx
/* @arkzen:console
sync-inventory:
  signature: arkzen:sync-inventory
  description: Syncs inventory levels from external source
daily-cleanup:
  signature: arkzen:daily-cleanup
  description: Removes old temporary records
  schedule: daily
*/
```

---

## SECTION 14 — @arkzen:components

All imports MUST go here. All custom components for this system go here.

```tsx
/* @arkzen:components */

'use client'

import React, { useState, useEffect }          from 'react'
import { Package, ShoppingCart, Plus, Trash2 } from 'lucide-react'
import { Modal }      from '@/arkzen/core/components/Modal'
import { Table }      from '@/arkzen/core/components/Table'
import { Chart }      from '@/arkzen/core/components/Chart'
import { Badge }      from '@/arkzen/core/components/utils'
import { useToast }   from '@/arkzen/core/components/Toast'
import { useQuery }   from '@/arkzen/core/hooks/useQuery'
import { useMutation } from '@/arkzen/core/hooks/useMutation'
import { arkzenFetch, useAuthStore } from '@/arkzen/core/stores/authStore'

// TypeScript interfaces — define ALL data shapes here
interface Product {
  id:         number
  name:       string
  sku:        string
  price:      number
  stock:      number
  created_at: string
}

interface Order {
  id:     number
  total:  number
  status: string
}

interface CartItem {
  product: Product
  qty:     number
}

// Custom components
const ProductCard = ({ product, onAdd }: { product: Product; onAdd: () => void }) => (
  <div className="arkzen-card p-4 hover:shadow-md transition-shadow">
    <h3 className="font-semibold text-sm">{product.name}</h3>
    <p className="text-xs text-neutral-400 font-mono">{product.sku}</p>
    <div className="flex items-center justify-between mt-3">
      <span className="font-bold">₱{product.price}</span>
      <button onClick={onAdd} className="arkzen-btn-primary text-xs px-3 py-1.5">
        <Plus size={12} /> Add
      </button>
    </div>
  </div>
)

/* @arkzen:components:end */
```

**Available engine imports:**
```
Components:
  @/arkzen/core/components/Modal
  @/arkzen/core/components/Drawer
  @/arkzen/core/components/Dialog
  @/arkzen/core/components/Table         (search, filter, column toggles)
  @/arkzen/core/components/Toast         (also: useToast hook)
  @/arkzen/core/components/Pagination
  @/arkzen/core/components/Breadcrumb
  @/arkzen/core/components/Loading
  @/arkzen/core/components/EmptyState
  @/arkzen/core/components/SortableList  (drag-and-drop reorder)
  @/arkzen/core/components/Chart         (line, bar, area, donut — SVG)
  @/arkzen/core/components/FileUpload    (dropzone + auto-upload)
  @/arkzen/core/components/RichTextEditor (TipTap wrapper)
  @/arkzen/core/components/Map           (Leaflet wrapper)
  @/arkzen/core/components/utils         (Badge, Avatar, Tooltip, Field, Form)

Hooks:
  @/arkzen/core/hooks/useQuery           (fetch + cache + retry)
  @/arkzen/core/hooks/useMutation        (POST/PUT/DELETE + optimistic)
  @/arkzen/core/hooks/useWebSocket       (Reverb connection)
  @/arkzen/core/hooks/useCRDT            (conflict resolution)

Auth:
  @/arkzen/core/stores/authStore         (useAuthStore, arkzenFetch)
```

---

## SECTION 15 — @arkzen:page

```tsx
/* @arkzen:page */

const PosSystemPage = () => {
  const pageRef       = React.useRef<HTMLDivElement>(null)
  const { toast }     = useToast()
  const { user }      = useAuthStore()

  // useQuery for cached, auto-retrying data fetching
  const { data: productData, isLoading } = useQuery<{ data: Product[] }>('/api/products', {
    params: { per_page: 100 },
  })

  const products = productData?.data ?? []

  // useMutation for POST/PUT/DELETE with cache invalidation
  const { mutate: createOrder, isLoading: ordering } = useMutation<Order, unknown>({
    method:     'POST',
    invalidates: ['/api/orders'],  // auto-refetch orders after checkout
    onSuccess:  () => toast.success('Order placed!'),
    onError:    (err) => toast.error(err),
  })

  const [cart, setCart] = useState<CartItem[]>([])

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { product, qty: 1 }]
    })
  }

  const checkout = async () => {
    const total = cart.reduce((s, i) => s + i.product.price * i.qty, 0)
    await createOrder('/api/orders', { total, items: cart })
    setCart([])
  }

  return (
    <div ref={pageRef} className="arkzen-container">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">POS System</h1>
        <span className="text-sm text-neutral-400">Welcome, {user?.name}</span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Product grid */}
        <div className="col-span-2 grid grid-cols-3 gap-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-neutral-100 animate-pulse" />
              ))
            : products.map(p => (
                <ProductCard key={p.id} product={p} onAdd={() => addToCart(p)} />
              ))
          }
        </div>

        {/* Cart */}
        <div className="arkzen-card p-4 flex flex-col h-fit">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <ShoppingCart size={16} /> Cart ({cart.length})
          </h2>
          {cart.map(item => (
            <div key={item.product.id} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
              <div>
                <p className="text-sm font-medium">{item.product.name}</p>
                <p className="text-xs text-neutral-400">x{item.qty}</p>
              </div>
              <span className="text-sm font-semibold">₱{(item.product.price * item.qty).toFixed(2)}</span>
            </div>
          ))}
          <div className="mt-4 pt-4 border-t border-neutral-200">
            <div className="flex justify-between font-bold mb-4">
              <span>Total</span>
              <span>₱{cart.reduce((s, i) => s + i.product.price * i.qty, 0).toFixed(2)}</span>
            </div>
            <button
              onClick={checkout}
              disabled={cart.length === 0 || ordering}
              className="arkzen-btn-primary w-full"
            >
              {ordering ? 'Processing...' : 'Checkout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* @arkzen:page:end */
```

**Rules:**
```
1. Component name: PascalCase + Page (e.g. PosSystemPage)
2. pageRef MUST be on root div
3. Use useQuery instead of raw fetch for GET requests
4. Use useMutation instead of raw fetch for POST/PUT/DELETE
5. Use arkzenFetch only for custom cases not covered by the hooks
6. All styling: Tailwind only
7. Do NOT export — engine handles it
8. Utility classes:
   arkzen-container      → max-w-7xl mx-auto px-6 py-8
   arkzen-card           → bg-white rounded-2xl border
   arkzen-input          → styled input field
   arkzen-btn-primary    → dark filled button
   arkzen-btn-secondary  → outlined button
   arkzen-btn-danger     → red button
```

---

## SECTION 16 — @arkzen:animation (optional, once)

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

## SECTION 17 — WHAT AI MUST NEVER DO

```
1.  Never generate incomplete sections
2.  Never skip @arkzen:components or @arkzen:page
3.  Never use 'any' TypeScript type
4.  Never export components or pages manually
5.  Never put imports outside @arkzen:components
6.  Never use inline styles — Tailwind only
7.  Never use class components — hooks only
8.  Never generate two tatemonos in one file
9.  Never use GSAP and Framer on same element
10. Never skip pageRef on root div
11. Never use MySQL syntax — SQLite only
12. Never put 'use client' anywhere except first line of @arkzen:components
13. Never add comments outside section markers
14. Never change section marker syntax
15. Never use raw fetch on protected API routes — always useQuery or useMutation or arkzenFetch
16. Never create a second auth store — import useAuthStore from the engine
17. Never use localStorage for auth — useAuthStore handles persistence
18. Never declare foreign keys to tables outside this tatemono (except users.id)
19. Never skip middleware declaration on sensitive routes
20. Never use recharts — use the built-in Chart component
21. Never use react-beautiful-dnd or similar — use the built-in SortableList
22. Never install chart libraries — Chart is built-in SVG
```

---

## SECTION 18 — GENERATION PROMPT TEMPLATE

```
ARKZEN GUIDELINES: [paste this document]

PROJECT STACK:
- Frontend: Next.js 16 + TypeScript + Tailwind + Zustand
- Backend: Laravel 13 + SQLite + Sanctum
- Real-time: Laravel Reverb
- Animation: GSAP + Framer Motion

REQUIREMENT:
[describe the full system — all features, pages, data it manages]

AUTH: [true | false]
REALTIME: [yes — describe what should be live | no]
BACKGROUND JOBS: [yes — describe | no]

Generate one complete Arkzen Tatemono TSX file.
File name: [system-name]
One file. Every table, every API resource, every page in one Tatemono.
Follow ALL guidelines strictly.
```

---

## SECTION 19 — COMPLETE STRUCTURE REFERENCE

```
system-name.tsx
│
├── /* @arkzen:meta              → identity, layout, auth
├── /* @arkzen:config            → OPTIONAL component overrides
│
├── /* @arkzen:database          → table 1
├── /* @arkzen:database          → table 2
├── /* @arkzen:database          → table N  (repeat as needed)
│
├── /* @arkzen:api               → resource 1 (model + controller + endpoints)
├── /* @arkzen:api               → resource 2
├── /* @arkzen:api               → resource N  (repeat as needed)
│
├── /* @arkzen:store             → OPTIONAL Zustand store
├── /* @arkzen:realtime          → OPTIONAL Reverb channels + CRDT
├── /* @arkzen:events            → OPTIONAL Laravel events + listeners
├── /* @arkzen:jobs              → OPTIONAL background jobs
├── /* @arkzen:notifications     → OPTIONAL notifications
├── /* @arkzen:mail              → OPTIONAL mailables
├── /* @arkzen:console           → OPTIONAL artisan commands
│
├── /* @arkzen:components        → ALL imports + interfaces + components
│   └── /* @arkzen:components:end */
│
├── /* @arkzen:page              → the full system page
│   └── /* @arkzen:page:end */
│
└── /* @arkzen:animation         → OPTIONAL GSAP + Framer
    └── /* @arkzen:animation:end */
```