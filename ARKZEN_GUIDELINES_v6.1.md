# ARKZEN GUIDELINES DOCUMENT v6.1
## For Claude AI — Generating Tatemono Files

---

## SECTION 1 — WHAT IS ARKZEN

Arkzen is a full-stack scaffolding engine built on Next.js TypeScript and Laravel. It uses a single file format called a **Tatemono** to define an entire system — multiple database tables, multiple backend API resources, middleware, multiple frontend pages and components, multiple stores, real-time channels, background jobs, notifications, events, and animations — all in one file.

**One Tatemono = one complete, fully isolated client system.**

Each Tatemono is its own world. It does not share anything with other Tatemonos. No shared auth, no shared components, no shared stores. Every Tatemono stands alone.

The engine is a **distribution tool**. It does NOT control or limit. The user controls everything. The engine just distributes the user's instructions to the right places.

**Stack:**
- Frontend: Next.js 16 + TypeScript + **Tailwind CSS** (required) + Zustand
- Backend: Laravel 13 + SQLite (per-tatemono isolated) + Laravel Sanctum
- Real-time: Laravel Reverb + custom CRDT
- Animation: GSAP + Framer Motion
- Icons: **Lucide React** (primary) + **Hero Icons** (secondary) — see Section 2B
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

## SECTION 2B — ICON & EMOJI POLICY

### Icons: Lucide React (Primary) + Hero Icons (Secondary)

**Lucide React is the default icon library for all Tatemono UI.**

```tsx
// Import from lucide-react — always prefer this first
import { Plus, Trash2, Edit2, Search, Bell, ChevronRight, X } from 'lucide-react'

// Hero Icons — use only when Lucide doesn't have the needed icon
import { SparklesIcon, AcademicCapIcon } from '@heroicons/react/24/outline'
import { StarIcon } from '@heroicons/react/24/solid'
```

**Rules:**
```
1. ALWAYS import from lucide-react first — check Lucide before Hero Icons
2. Use Hero Icons only when the specific icon is not in Lucide
3. Never use emoji as icon replacements — use actual icon components
4. Icon size: use the `size` prop on Lucide (e.g. <Plus size={16} />)
5. Icon size: use className on Hero Icons (e.g. className="w-4 h-4")
6. Never use both lucide AND heroicons for the same semantic meaning
7. Icons must be semantically correct — don't use a heart icon for a delete button
```

**Common Lucide icons for standard UI actions:**
```
Plus, Minus, X (close), Check, ChevronRight, ChevronLeft, ChevronDown, ChevronUp
Search, Filter, SortAsc, SortDesc
Edit2, Edit3, Pencil (edit), Trash2 (delete), Copy
Eye, EyeOff (show/hide)
Bell, BellOff (notifications)
Upload, Download, ExternalLink
User, Users, UserPlus
Settings, Sliders
LogIn, LogOut
Home, Menu, LayoutDashboard
Package, Box, Tag, Layers (inventory/products)
Mail, Send, Inbox
Calendar, Clock, Timer
AlertCircle, AlertTriangle, Info, CheckCircle, XCircle (status)
Loader2 (loading spinner — use animate-spin)
MoreHorizontal, MoreVertical (overflow menu)
```

### Emoji Policy

**Emoji must only be used when ABSOLUTELY necessary — meaning the design specifically calls for emoji as content (e.g. a reaction picker, an emoji-based mood tracker).**

```
NEVER use emoji as:
- Navigation icons
- Button icons
- Status indicators
- Section headers
- Loading states
- Toast icons

ONLY use emoji when:
- The feature is literally about emoji (reaction system, emoji picker)
- The brand/client explicitly requires emoji in UI
- Content data itself is emoji (e.g. displaying user-submitted emoji reactions)
```

---

## SECTION 2C — DESIGN AESTHETIC POLICY

### Awwwards-Quality, Apple-Minimalist Design Standard

All Tatemono UI must meet a **modern, minimalist, premium standard** — think Apple.com, Linear.app, Vercel.com, Stripe Dashboard. Reference Awwwards.com for inspiration. Every page should feel production-ready enough to ship to a real client on day one.

**Design Principles:**
```
1. Whitespace over clutter — give elements room to breathe
2. Neutral palette foundation — whites, off-whites, neutral-50/100/200 as base
3. One accent color maximum per tatemono — never rainbow UI
4. Typography hierarchy — clear size/weight contrast between headings and body
5. Micro-interactions — hover states, transitions on buttons/cards
6. Consistent border radius — pick one and stick to it per tatemono (usually rounded-xl or rounded-2xl)
7. Subtle shadows — shadow-sm or shadow-md, never heavy drop shadows
8. Border as separator — prefer border-neutral-100/200 over background fills
9. Cards have purpose — every card-like element has clear visual hierarchy inside it
10. Actions are clear — primary action is always visually dominant
```

**Color System (what to default to when user doesn't specify):**
```tsx
// Backgrounds
bg-white              // main content areas
bg-neutral-50         // page/outer backgrounds
bg-neutral-100        // subtle hover/active states

// Text
text-neutral-900      // primary text (headings)
text-neutral-600      // secondary text (descriptions)
text-neutral-400      // tertiary/placeholder text

// Borders
border-neutral-200    // card borders, dividers
border-neutral-100    // very subtle separators

// Accent (pick ONE per tatemono — example with neutral dark)
bg-neutral-900        // primary button fill
text-white            // button text
hover:bg-neutral-800  // button hover

// Status colors
text-emerald-600 bg-emerald-50   // success
text-amber-600 bg-amber-50       // warning
text-red-500 bg-red-50           // error/danger
text-blue-600 bg-blue-50         // info
```

**Button Design Standard:**
```tsx
// Primary button — dark filled, clean
<button className="bg-neutral-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-neutral-800 transition-colors flex items-center gap-2">
  <Plus size={15} /> Add Item
</button>

// Secondary button — outlined
<button className="border border-neutral-200 text-neutral-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-neutral-50 transition-colors">
  Cancel
</button>

// Danger button — red accent
<button className="text-red-500 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1.5">
  <Trash2 size={14} /> Delete
</button>

// Ghost/icon button
<button className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors">
  <Edit2 size={14} />
</button>
```

**Card Design Standard:**
```tsx
// Standard card
<div className="bg-white rounded-2xl border border-neutral-200 p-6">
  ...
</div>

// Card with section header
<div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
  <div className="px-6 py-4 border-b border-neutral-100">
    <h2 className="text-sm font-semibold text-neutral-900">Section Title</h2>
    <p className="text-xs text-neutral-500 mt-0.5">Optional description</p>
  </div>
  <div className="p-6">
    ...
  </div>
</div>
```

**Table Design Standard:**
```tsx
<table className="w-full text-sm">
  <thead>
    <tr className="border-b border-neutral-100">
      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wide">Name</th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-neutral-50 hover:bg-neutral-50 transition-colors">
      <td className="px-4 py-3.5 text-neutral-700">...</td>
    </tr>
  </tbody>
</table>
```

**Form Input Standard:**
```tsx
<input
  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-colors"
  placeholder="Enter value..."
/>
```

**Page Header Standard:**
```tsx
<div className="flex items-center justify-between mb-8">
  <div>
    <h1 className="text-xl font-semibold text-neutral-900">Page Title</h1>
    <p className="text-sm text-neutral-500 mt-0.5">Supporting description</p>
  </div>
  <button className="bg-neutral-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-neutral-800 transition-colors flex items-center gap-2">
    <Plus size={15} /> Primary Action
  </button>
</div>
```

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
   @arkzen:database[:identifier]    (REPEAT — identifier optional when single table)
   @arkzen:api[:identifier]         (REPEAT — identifier optional when single resource)
   @arkzen:routes                   (optional — custom routes, no identifier)
   @arkzen:middleware:name          (optional, REPEAT — named :end block with PHP body)
   @arkzen:store:identifier         (optional, REPEAT)
   @arkzen:realtime:identifier      (optional, REPEAT — named :end block)
   @arkzen:events:identifier        (optional, REPEAT — named :end block)
   @arkzen:listener:name            (optional, REPEAT — named :end block with PHP body)
   @arkzen:jobs:identifier          (optional, REPEAT — named :end block with PHP body)
   @arkzen:notifications:identifier (optional, REPEAT — named :end block, YAML + optional toMail() body)
   @arkzen:mail:identifier          (optional, REPEAT — named :end block, YAML + optional Blade body)
   @arkzen:console:identifier       (optional, REPEAT — named :end block with PHP body)
   @arkzen:endpoint:name            (optional, REPEAT — named :end block with PHP body)
   @arkzen:handler:name             (optional, REPEAT — named :end block with PHP body)
   @arkzen:layout:name              (optional, REPEAT — custom layouts)
   @arkzen:components:identifier    (REPEAT — one per group)
   @arkzen:page:name                (REPEAT — one per page/route)
   @arkzen:error:404                (optional — Next.js not-found.tsx component)
   @arkzen:error:500                (optional — Next.js error.tsx component)
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

**Roles (when auth: true):**
- Users table includes a `role` column (varchar 20, default 'user') — managed by AuthBuilder automatically
- Promote/demote via endpoint types: `role_promote`, `role_demote`
- Admin-only endpoints use type: `role_admin_only`
- User-only endpoints use type: `role_user_only`
- No need to add @arkzen:database:users — AuthBuilder handles it

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

## SECTION 7 — @arkzen:database (REPEAT — identifier optional)

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

**Identifier rules:**
```
1. Identifier after @arkzen:database: is OPTIONAL when there is only one table
   /* @arkzen:database        → valid for single-table tatemonos
   /* @arkzen:database:items  → required when multiple tables exist
2. When using multiple @arkzen:database blocks, ALL must have identifiers
3. Table name always plural snake_case
4. Foreign keys reference table.column within same Tatemono ONLY
5. Exception: users.id is allowed for auth:true Tatemonos
6. Seeder is optional per table
7. softDeletes: true adds deleted_at
8. Engine auto-sorts migrations by foreign key dependency
9. Never add a database:users block — AuthBuilder manages this for auth:true Tatemonos
```

---

## SECTION 8 — @arkzen:api (REPEAT — identifier optional)

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
[]                              → public, no auth
[throttle:60,1]                 → rate limit only, no auth
[auth]                          → Sanctum token required (shorthand)
[auth:sanctum]                  → Sanctum token required (explicit)
[auth:sanctum, throttle:60,1]   → auth + rate limit
[auth:sanctum, role:admin]      → auth + admin role only
```

**RULE: Only use `auth:sanctum` or `[auth]` in middleware if `auth: true` in meta.**

**Special endpoint types:**
```
type: notification_trigger  → Routes through native Laravel notifications (no model needed)
type: role_admin_only       → Generates admin role check in controller body
type: role_user_only        → Generates user-role check in controller body
type: role_promote          → Promotes authenticated user to admin
type: role_demote           → Demotes authenticated user to user role
type: upload                → File upload store endpoint
type: upload_destroy        → File upload delete endpoint
type: command_run           → Runs an Artisan command (scheduler-test pattern)
type: job_dispatch          → Dispatches a background job
type: event_fire            → Fires a Laravel event
type: broadcast             → Broadcasts a Reverb event
type: mail_send             → Sends a Mailable
```

**Custom endpoint body injection (v5.8) — `@arkzen:endpoint:name`:**

Any endpoint name that doesn't match a standard CRUD name (index, show, store, update, destroy) gets routed through `generateCustomMethod()`. You can inject PHP into it via a named `@arkzen:endpoint:name` DSL block. The body is placed after all `@arkzen:api` blocks:

```tsx
/* @arkzen:endpoint:stats
*/
$total = \App\Models\Arkzen\MyModule\Product::count();
$value = \App\Models\Arkzen\MyModule\Product::sum('price');
return response()->json(['total' => $total, 'value' => $value]);
/* @arkzen:endpoint:stats:end */
```

- The endpoint must already be declared inside an `@arkzen:api` block
- The name in `@arkzen:endpoint:name` must exactly match the endpoint key in the YAML
- If no `@arkzen:endpoint` block is provided, the engine emits a stub with a TODO comment
- Standard CRUD methods (index, show, store, update, destroy) are NOT injectable — they are generated from schema

**Optional flags per @arkzen:api block:**
```
resource: true   → generates API Resource class
policy: true     → generates Policy class
factory: true    → generates Model Factory
```

---

## SECTION 9 — @arkzen:routes (optional — custom routes, no identifier)

Use for custom controllers that don't follow the standard CRUD resource pattern (e.g. simulation endpoints, custom command runners).

```tsx
/* @arkzen:routes
controller: SimulateController
middleware: []
routes:
  - method: GET
    route: /api/errors-test/simulate/{code}
    handler: simulate
  - method: POST
    route: /api/errors-test/reset
    handler: reset
*/
```

**Handler body injection — `@arkzen:handler:name` (v2.0):**

Custom route handlers can have their PHP body injected via a named `@arkzen:handler:name` DSL block. Place these after the `@arkzen:routes` block:

```tsx
/* @arkzen:handler:reset
*/
\App\Models\Arkzen\MyModule\MyModel::truncate();
return response()->json(['message' => 'Reset complete']);
/* @arkzen:handler:reset:end */
```

- The handler name must exactly match the `handler:` value in the routes YAML
- Special case: if the route contains a `{code}` parameter, the engine auto-generates a simulation handler — body injection is ignored for that route
- If no `@arkzen:handler` block is provided, the engine emits a TODO stub

**Rules:**
```
1. No identifier needed — only one @arkzen:routes block per Tatemono
2. handler name maps to the public method on the generated controller
3. middleware follows same rules as @arkzen:api middleware
4. Use for non-resource routes: simulators, command runners, custom actions
```

---

## SECTION 10 — @arkzen:middleware (optional, REPEAT — named :end block)

Middleware is declared as **named** blocks. The YAML config (currently reserved for future options) goes in the opening comment. The `handle()` method body goes between the comment close `*/` and the `:end` marker.

```
/* @arkzen:middleware:requireJson
*/
if (!$request->isJson()) {
    return response()->json([
        'message' => 'Content-Type: application/json is required.',
        'hint'    => 'Set the Content-Type header to application/json',
    ], 415);
}
return $next($request);
/* @arkzen:middleware:requireJson:end */

/* @arkzen:middleware:checkSubscription
*/
$user = $request->user();
if (!$user || !$user->subscribed) {
    return response()->json(['message' => 'Subscription required.'], 403);
}
return $next($request);
/* @arkzen:middleware:checkSubscription:end */
```

**How it wires up:**

The middleware name (e.g. `requireJson`) is declared in the `@arkzen:api` or `@arkzen:routes` middleware array. The engine:
1. Generates `app/Http/Middleware/Arkzen/{SlugNs}/{ClassName}.php` with the injected `handle()` body
2. Registers the alias in the route file so Laravel can resolve the string at runtime
3. Adds the `use` statement for the scoped class

```tsx
/* @arkzen:api
middleware: [auth:sanctum, requireJson, checkSubscription]
...
*/
```

**Built-in middleware (no file generated — pass through directly):**
```
auth             → resolved to auth:sanctum
auth:sanctum     → Sanctum guard
throttle         → Laravel rate limiter (e.g. throttle:60,1)
verified         → email verification guard
cors             → CORS middleware
api              → always injected as the first middleware
web              → web middleware group
cache.headers    → HTTP cache headers
role:admin       → generates scoped CheckRole middleware (special case)
```

**Rules:**
```
1. Name is camelCase (e.g. requireJson, checkSubscription)
2. The @arkzen:middleware:name block MUST exist if the middleware name is declared
   in @arkzen:api or @arkzen:routes and is NOT a built-in
3. Falls back to a TODO stub if the block body is empty — but always declare it
4. Multiple custom middleware blocks are supported — one per name
5. If file already exists on disk, alias is still re-registered — idempotent
```

---

## SECTION 11 — @arkzen:store (REPEAT — identifier required)

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

## SECTION 12 — @arkzen:jobs, @arkzen:console, @arkzen:events, @arkzen:realtime, @arkzen:notifications, @arkzen:mail

### @arkzen:jobs — Named :end blocks WITH PHP handle() body

Jobs are **named** blocks. The YAML config goes in the opening comment. The `handle()` body goes between `*/` and the `:end` marker.

```tsx
/* @arkzen:jobs:process-data
queue: default
tries: 3
timeout: 30
*/
public function handle(): void
{
    \App\Models\Arkzen\MyModule\MyModel::create([
        'status' => 'completed',
        'result' => 'Job finished successfully',
    ]);
}
/* @arkzen:jobs:process-data:end */

/* @arkzen:jobs:heavy-computation
queue: heavy
tries: 1
timeout: 120
*/
public function handle(): void
{
    sleep(5);
    // heavy work...
}
/* @arkzen:jobs:heavy-computation:end */

/* @arkzen:jobs:always-fails
queue: default
tries: 2
timeout: 10
*/
public function handle(): void
{
    throw new \Exception('This job always fails');
}
/* @arkzen:jobs:always-fails:end */
```

**Job YAML fields:**
```
queue:   default | heavy | emails | any custom queue name
tries:   integer — retry attempts on failure
timeout: integer — seconds before job is killed
```

**Notes:**
- If the body contains the full `public function handle(): void { ... }` signature, the engine strips the signature and uses only the inner lines
- Falls back to a log-and-TODO stub if no body is provided
- The generated class always has a `failed()` method that logs the exception

### @arkzen:console — Named :end blocks WITH PHP handle() body

Console commands are **named** blocks with YAML config + PHP body.

```tsx
/* @arkzen:console:cleanup-temp
signature: mymodule:cleanup-temp
description: Deletes temporary files older than 24h
schedule: '0 * * * *'
*/
public function handle(): int
{
    $this->info('Running cleanup...');
    // Your PHP command logic here
    return Command::SUCCESS;
}
/* @arkzen:console:cleanup-temp:end */

/* @arkzen:console:generate-report
signature: mymodule:generate-report
description: Generates a daily activity report
schedule: '0 8 * * *'
*/
public function handle(): int
{
    $this->info('Generating report...');
    return Command::SUCCESS;
}
/* @arkzen:console:generate-report:end */
```

**Console YAML fields:**
```
signature:   artisan command name (e.g. mymodule:do-thing)
description: human-readable description
schedule:    cron expression (e.g. '0 * * * *', '*/5 * * * *', '0 8 * * *')
             IMPORTANT: wrap cron expressions in single quotes — */5 contains */ which can break YAML
```

**Notes:**
- If `schedule:` is declared, the engine auto-registers the command in `routes/console.php` — no manual setup needed
- Falls back to a log-and-TODO stub if no body is provided

### @arkzen:events — Named :end blocks (YAML only, with optional listener body injection)

Events are **named** blocks with YAML only — no PHP body in the event block itself.

```tsx
/* @arkzen:events:user-signed-up
listeners: [SendWelcomeEmail, UpdateUserStats, NotifyAdmins]
*/
/* @arkzen:events:user-signed-up:end */

/* @arkzen:events:order-placed
listeners: [ProcessPayment, UpdateInventory, SendOrderConfirmation]
*/
/* @arkzen:events:order-placed:end */
```

**Listener body injection — `@arkzen:listener:ListenerName` (v3.2):**

Listener `handle()` bodies can be injected via named `@arkzen:listener:ClassName` blocks. Place these after the `@arkzen:events` blocks:

```tsx
/* @arkzen:listener:SendWelcomeEmail
*/
\Mail::to($event->data['email'] ?? '')->send(
    new \App\Mail\Arkzen\MyModule\WelcomeMail($event->data)
);
/* @arkzen:listener:SendWelcomeEmail:end */

/* @arkzen:listener:ProcessPayment
*/
$orderId = $event->data['order_id'] ?? null;
\Log::info('[Payment] Processing order: ' . $orderId);
// payment logic here
/* @arkzen:listener:ProcessPayment:end */
```

- The listener class name must exactly match the string declared in the `listeners:` array
- Falls back to a log-and-EventLog-record stub if no body is provided
- The generated listener implements `ShouldQueue` — all listeners are queued

### @arkzen:realtime — Named :end blocks (YAML only)

Realtime channel definitions are **named** blocks with YAML only.

```tsx
/* @arkzen:realtime:my-public-channel
type: public
*/
/* @arkzen:realtime:my-public-channel:end */

/* @arkzen:realtime:my-private-channel
type: private
*/
/* @arkzen:realtime:my-private-channel:end */

/* @arkzen:realtime:event-name
channel: my-public-channel
type: public
*/
/* @arkzen:realtime:event-name:end */
```

### @arkzen:notifications — Named :end blocks (YAML + optional toMail() body injection)

Notification blocks support **optional PHP body injection** for the `toMail()` method (v3.9). The YAML config goes in the opening comment. If a PHP body is placed between `*/` and `:end`, it is injected into `toMail()` instead of the generated stub.

```tsx
/* @arkzen:notifications:order-confirmed
channels: [database, mail]
message: Your order has been confirmed
subject: Order Confirmation
*/
/* @arkzen:notifications:order-confirmed:end */
```

With injected `toMail()` body:

```tsx
/* @arkzen:notifications:order-confirmed
channels: [database, mail]
message: Your order has been confirmed
subject: Order Confirmation
*/
return (new \Illuminate\Notifications\Messages\MailMessage)
    ->subject('Order #' . ($this->data['order_id'] ?? '') . ' Confirmed')
    ->greeting('Hello ' . ($this->data['name'] ?? 'there') . '!')
    ->line('Your order has been confirmed and is being processed.')
    ->action('View Order', url('/orders/' . ($this->data['order_id'] ?? '')))
    ->line('Thank you for your purchase.');
/* @arkzen:notifications:order-confirmed:end */
```

**What is injectable vs fixed:**
```
toMail()       → INJECTABLE — provide a PHP body between */ and :end
toBroadcast()  → FIXED — always returns ['message' => ..., 'data' => $this->data]
toArray()      → FIXED — always returns type/message/tatemono merged with $this->data
```

**Notification YAML fields:**
```
channels:      [database] | [mail] | [broadcast] | [database, mail] | [broadcast, database] | etc.
message:       string — used in toArray() and default toMail() stub
subject:       string — used in default toMail() stub subject line
channel_type:  private (default) | public | presence
               only applies when 'broadcast' is in channels
```

**Notification `channel_type` values:**
```
private   → PrivateChannel('{slug}.{user_id}')      ← default
public    → Channel('{slug}.notifications')
presence  → PresenceChannel('{slug}.{user_id}')
```

### @arkzen:mail — Named :end blocks (YAML + optional Blade view body injection)

Mail blocks support **optional Blade/HTML body injection** for the view file (v3.1). The YAML config goes in the opening comment. If a Blade/HTML body is placed between `*/` and `:end`, it is written as the actual Blade view file instead of the generic stub.

The Mailable class structure (envelope, content, attachments) is always generated from YAML — it is not injectable.

```tsx
/* @arkzen:mail:welcome-mail
subject: "Welcome to the platform"
data:
  username: string
  app_name: string
*/
/* @arkzen:mail:welcome-mail:end */
```

With injected Blade view body:

```tsx
/* @arkzen:mail:order-confirmation
subject: "Your order has been confirmed"
data:
  order_id: string
  total: string
  customer_name: string
*/
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Order Confirmed</title></head>
<body style="font-family: sans-serif; padding: 40px; color: #333; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #111;">Order Confirmed ✓</h2>
  <p>Hi {{ $customer_name }},</p>
  <p>Your order <strong>#{{ $order_id }}</strong> has been confirmed.</p>
  <p style="font-size: 20px; font-weight: bold;">Total: ${{ $total }}</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="color: #999; font-size: 12px;">Thank you for your purchase.</p>
</body>
</html>
/* @arkzen:mail:order-confirmation:end */
```

**What is injectable vs fixed:**
```
Blade view file     → INJECTABLE — provide HTML/Blade between */ and :end
Mailable class      → FIXED — envelope(subject), content(view), attachments() generated from YAML
data: fields        → CONFIG — declare in YAML; become public readonly properties on the Mailable
```

**Mail YAML fields:**
```
subject:  string — the email subject line
data:     map of field → type — these become constructor args + public properties on the Mailable
```

---

## SECTION 14 — LAYOUT SYSTEM

### Two Base Layouts

| Layout  | Type      | Guard |
|---------|-----------|-------|
| `guest` | Public    | Redirects logged-in users away (only if `auth: true` in meta) |
| `auth`  | Protected | Redirects unauthenticated users to login (only if `auth: true` in meta) |

**Both layouts are EMPTY. No sidebar, no topbar. You build your own structure inside each page.**

**RULE: If `auth: false`, ALL pages use `layout:guest`. No `layout:auth` ever.**

### Custom Layouts

Define reusable layouts for shared structure within the same Tatemono.

```tsx
/* @arkzen:layout:dashboard-layout */
export const DashboardLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-screen bg-neutral-50">
    <aside className="w-60 bg-white border-r border-neutral-200 flex flex-col shrink-0">
      <div className="px-4 py-5 border-b border-neutral-100">
        <span className="text-sm font-semibold text-neutral-900">App Name</span>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {/* Nav items here */}
      </nav>
    </aside>
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      <header className="h-14 bg-white border-b border-neutral-200 px-6 flex items-center justify-between shrink-0">
        {/* Topbar content */}
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

## SECTION 15 — @arkzen:components (REPEAT — identifier required)

All imports MUST go here. Custom components for this system go here.
Split by logical grouping — one block per section of the system.

```tsx
/* @arkzen:components:shared */

'use client'

import React, { useState, useEffect } from 'react'
import { Package, Plus, Trash2, Edit2, Search } from 'lucide-react'
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

Icons (always):
  lucide-react    (primary — import named icons)
  @heroicons/react/24/outline   (secondary — only when Lucide lacks the icon)
  @heroicons/react/24/solid     (secondary — for filled variants)
```

---

## SECTION 16 — @arkzen:page (REPEAT — name required)

Each page is its own route: `/{tatemono-name}/{page-name}`
Special case: page named `index` → `/{tatemono-name}` (no subfolder)

```tsx
/* @arkzen:page:dashboard */
/* @arkzen:page:layout:guest */
const DashboardPage = () => {
  return (
    <div className="arkzen-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Overview of your data</p>
        </div>
      </div>
      {/* Content */}
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
11. Every page must follow the v6 design aesthetic standard (Section 2C)
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

## SECTION 17 — @arkzen:animation (optional, once)

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

## SECTION 18 — @arkzen:error (optional — 404 and 500 handlers)

Use these to define Next.js segment-scoped error pages for the tatemono. They generate `not-found.tsx` and `error.tsx` inside the tatemono's route segment.

```tsx
/* @arkzen:error:404 */
const NotFoundPage = () => (
  <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
    <div className="text-center">
      <p className="text-6xl font-bold text-neutral-200 mb-4">404</p>
      <h1 className="text-xl font-semibold text-neutral-800 mb-2">Page not found</h1>
      <p className="text-sm text-neutral-500">The page you're looking for doesn't exist.</p>
    </div>
  </div>
)
/* @arkzen:error:404:end */

/* @arkzen:error:500 */
const ServerErrorPage = ({ reset }: { reset: () => void }) => (
  <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
    <div className="text-center">
      <p className="text-6xl font-bold text-neutral-200 mb-4">500</p>
      <h1 className="text-xl font-semibold text-neutral-800 mb-2">Something went wrong</h1>
      <button onClick={reset} className="mt-4 text-sm text-neutral-600 underline">Try again</button>
    </div>
  </div>
)
/* @arkzen:error:500:end */
```

**Rules:**
```
1. Only @arkzen:error:404 and @arkzen:error:500 are valid types
2. Both are optional — use only what you need
3. error:404 generates not-found.tsx (no props)
4. error:500 generates error.tsx (receives { reset: () => void } prop)
5. Place after all @arkzen:page blocks, before @arkzen:animation
6. Follow v6 design aesthetic — clean, minimal error state
```

---

## SECTION 18B — COMPLETE DSL BODY INJECTION REFERENCE (v6.1)

This is the authoritative table of every block that supports PHP or HTML body injection. When a block supports injection, the PHP/HTML goes **between `*/` and the `:end` marker**. The opening `/* @arkzen:... */` comment carries YAML config only.

| DSL Block | Builder | Injection Status | What is injected | Falls back to |
|-----------|---------|-----------------|-----------------|---------------|
| `@arkzen:jobs:name` | JobBuilder v3.1 | **Full body** | PHP → `handle(): void` inner lines | Log + TODO stub |
| `@arkzen:console:name` | ConsoleBuilder v4.0 | **Full body** | PHP → `handle(): int` inner lines | Log + TODO stub |
| `@arkzen:middleware:name` | MiddlewareBuilder v7.0 | **Full body** | PHP → `handle()` inner lines | TODO stub |
| `@arkzen:listener:Name` | ListenerBuilder v3.2 | **Full body** | PHP → `handle(Event $event)` inner lines | Log + EventLog record stub |
| `@arkzen:endpoint:name` | ControllerBuilder v5.8 | **Full body** | PHP → custom controller method body | TODO stub |
| `@arkzen:handler:name` | CustomRouteBuilder v2.0 | **Full body** | PHP → custom route handler method body | TODO stub |
| `@arkzen:notifications:name` | NotificationBuilder v3.9 | **Partial** | PHP → `toMail()` body only | Generic MailMessage chain |
| `@arkzen:mail:name` | MailBuilder v3.1 | **Partial** | HTML/Blade → written as view file | Generic HTML stub |
| `@arkzen:events:name` | EventBuilder v3.0 | **Config only** | No body — listeners declared in YAML | n/a |
| `@arkzen:realtime:name` | BroadcastBuilder v3.2 | **Config only** | No body — channel/type from YAML | n/a |
| `@arkzen:database[:name]` | MigrationBuilder | **Config only** | No body — columns/indexes from YAML | n/a |
| `@arkzen:api[:name]` | ControllerBuilder (CRUD) | **Config only** | CRUD methods generated from schema — not injectable | n/a |
| `@arkzen:store:name` | Frontend only | **Full body** | TypeScript/React — the entire store body | n/a |
| `@arkzen:page:name` | Frontend only | **Full body** | TypeScript/React — the entire page component | n/a |
| `@arkzen:components:name` | Frontend only | **Full body** | TypeScript/React — imports + components | n/a |
| `@arkzen:layout:name` | Frontend only | **Full body** | TypeScript/React — layout component | n/a |

**Body stripping:** For jobs, console, listeners, middleware, endpoints, and handlers — if you write the full function signature (`public function handle(): void { ... }`), the engine strips the signature and uses only the inner lines. You can write just the inner lines directly.

---

## SECTION 19 — NEVER DO (Complete Rules List)

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
30. Never use emoji as icon replacements — use lucide-react icons
31. Never use emoji in UI unless the feature is literally about emoji
32. Never use any icon library other than lucide-react (primary) or heroicons (secondary)
33. Never generate cluttered, low-contrast, or visually noisy UI — follow the minimalist aesthetic
34. Never use heavy drop shadows, rainbow colors, or more than one accent color per tatemono
35. Never add @arkzen:database:users — AuthBuilder manages users for auth:true tatemonos
36. Never write @arkzen:mail as a single no-identifier block — use named @arkzen:mail:name :end blocks
37. Never write @arkzen:jobs or @arkzen:console as plain YAML comment blocks — they require named :end blocks with PHP handle() body
38. Never write cron expressions in console schedule without single quotes — always schedule: '*/5 * * * *' not schedule: */5 * * * *
39. Never add @arkzen:database or @arkzen:api identifiers when there is only one table/resource — identifier is optional for single blocks
40. Never declare a custom middleware in @arkzen:api or @arkzen:routes without a matching @arkzen:middleware:name block (unless it's a built-in)
41. Never inject a body into @arkzen:events — events are data carriers, use @arkzen:listener:Name for listener logic
42. Never inject a body into @arkzen:realtime — channel config is YAML only
43. Never write @arkzen:endpoint:name without first declaring the endpoint key inside an @arkzen:api block
44. Never write @arkzen:handler:name without first declaring the handler in an @arkzen:routes block
```

---

## SECTION 20 — VALIDATION

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

## SECTION 21 — EXPORT SYSTEM

### How Export Works

```bash
node export.js <tatemono-name>
# Output: projects/<tatemono-name>/
#   frontend/   → standalone Next.js app
#   backend/    → standalone Laravel app
#   start.js    → one-command launcher
```

The exported project is completely standalone — no Arkzen engine dependency. It includes its own `start.js` that spawns:
- `php artisan serve --port=8001` (backend)
- `npm run dev --port=3001` (frontend, with rewrite proxy to backend)

### ENV Strategy: Global ENV (Recommended)

**Use the global Arkzen `.env` even for exports.** The export script reads `.env.example` from the backend engine and generates a standalone `.env` for the exported project — pointing directly to the tatemono's isolated SQLite file.

**You do NOT need a separate per-tatemono `.env` in development.** Each tatemono already has its own isolated SQLite database at `engine/backend/database/arkzen/<tatemono-name>.sqlite`. The global engine `.env` manages everything during development.

**For export (production/client delivery):**
The `export.js` auto-generates a clean `.env` for the exported project:
```
APP_NAME=<tatemono-name>
APP_ENV=local
APP_DEBUG=true
DB_CONNECTION=sqlite
DB_DATABASE=<absolute-path-to-exported-sqlite>
```

**Summary:**
```
Development:   global engine .env → handles all tatemonos
Export:        auto-generated .env per exported project → self-contained
Production:    edit projects/<n>/backend/.env after export for server-specific values
```

---

## SECTION 22 — GENERATION PROMPT TEMPLATE

```
ARKZEN GUIDELINES: [paste this document or reference v6.1]

PROJECT STACK:
- Frontend: Next.js 16 + TypeScript + Tailwind CSS + Zustand
- Backend: Laravel 13 + SQLite + Sanctum
- Real-time: Laravel Reverb (if needed)
- Animation: GSAP + Framer Motion (if needed)
- Icons: Lucide React (primary), Hero Icons (secondary)
- Design: Apple-minimalist, Awwwards-quality

REQUIREMENT:
[describe the full system — all features, pages, data it manages]

AUTH: [true | false]
  If true — Tatemono has its own login/register flow.
  If false — No auth pages. All pages public.

REALTIME: [yes — describe what should be live | no]
BACKGROUND JOBS: [yes — describe | no]
ROLES: [yes — admin/user split needed | no]

Generate one complete Arkzen Tatemono TSX file.
File name: [system-name]
One file. Every table, every API resource, every page in one Tatemono.
Follow ALL v6.1 guidelines strictly.
Design must meet the minimalist premium standard (Section 2C).
Icons from lucide-react only. No emoji in UI.
```

---

## SECTION 23 — COMPLETE STRUCTURE REFERENCE v6.1

```
tatemonos/<n>/core.tsx
│
├── /* @arkzen:meta              → identity, auth: true|false
├── /* @arkzen:config            → OPTIONAL component overrides + layout config
│
├── /* @arkzen:database          → table definition (no identifier = single table)
├── /* @arkzen:database:table1   → table 1 definition (identifier required if multiple)
├── /* @arkzen:database:table2   → table 2 definition  (repeat as needed)
│
├── /* @arkzen:api               → resource (no identifier = single resource)
├── /* @arkzen:api:resource1     → resource 1 (identifier required if multiple)
├── /* @arkzen:api:resource2     → resource 2  (repeat as needed)
│
├── /* @arkzen:routes            → OPTIONAL custom routes (no identifier, YAML comment)
│
├── /* @arkzen:middleware:name   → OPTIONAL custom middleware (PHP handle() body + :end)
│   if (!$request->isJson()) { ... }
│   return $next($request);
│   └── /* @arkzen:middleware:name:end */
│
├── /* @arkzen:store:name        → OPTIONAL Zustand stores (repeat)
│   └── /* @arkzen:store:name:end */
│
├── /* @arkzen:realtime:channel  → OPTIONAL Reverb channel (YAML comment + :end)
│   └── /* @arkzen:realtime:channel:end */
│
├── /* @arkzen:events:event-name → OPTIONAL Laravel event (YAML + :end)
│   listeners: [ListenerA, ListenerB]
│   └── /* @arkzen:events:event-name:end */
│
├── /* @arkzen:listener:ListenerA → OPTIONAL listener body injection (PHP handle() + :end)
│   // PHP body for ListenerA::handle()
│   └── /* @arkzen:listener:ListenerA:end */
│
├── /* @arkzen:jobs:job-name     → OPTIONAL job (YAML + PHP handle() + :end)
│   public function handle(): void { ... }
│   └── /* @arkzen:jobs:job-name:end */
│
├── /* @arkzen:notifications:name → OPTIONAL notification (YAML + optional toMail() body + :end)
│   └── /* @arkzen:notifications:name:end */
│
├── /* @arkzen:mail:name         → OPTIONAL mailable (YAML + optional Blade body + :end)
│   └── /* @arkzen:mail:name:end */
│
├── /* @arkzen:console:cmd-name  → OPTIONAL command (YAML + PHP handle() + :end)
│   public function handle(): int { ... return Command::SUCCESS; }
│   └── /* @arkzen:console:cmd-name:end */
│
├── /* @arkzen:endpoint:name     → OPTIONAL custom endpoint body injection (PHP + :end)
│   // PHP body for the custom endpoint method
│   └── /* @arkzen:endpoint:name:end */
│
├── /* @arkzen:handler:name      → OPTIONAL custom route handler body injection (PHP + :end)
│   // PHP body for the custom route handler method
│   └── /* @arkzen:handler:name:end */
│
├── /* @arkzen:layout:name       → OPTIONAL custom reusable layouts (repeat)
│   └── /* @arkzen:layout:name:end */
│
├── /* @arkzen:components:group1 → 'use client' + imports + interfaces + components
│   └── /* @arkzen:components:group1:end */
│
│   ── auth: false Tatemono ──────────────────────────────────
├── /* @arkzen:page:index        → public index page
│   /* @arkzen:page:layout:guest */
│   └── /* @arkzen:page:index:end */
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
├── /* @arkzen:error:404 */      → OPTIONAL Next.js not-found.tsx (after pages)
│   └── /* @arkzen:error:404:end */
│
├── /* @arkzen:error:500 */      → OPTIONAL Next.js error.tsx (after pages)
│   └── /* @arkzen:error:500:end */
│
└── /* @arkzen:animation         → OPTIONAL GSAP + Framer (once)
    └── /* @arkzen:animation:end */
```

---

## SECTION 24 — THE 12 VALIDATED SYSTEM BLUEPRINTS (Reference)

These are the 12 proven, fully working Tatemono types. Use these as generation references.

| # | Name | Auth | Key Features |
|---|------|------|-------------|
| 1 | `auth-test` | true | Register, login, logout, protected dashboard |
| 2 | `broadcast-test` | true | Public/private/presence Reverb channels, real-time messaging |
| 3 | `crud-test` | false | Full CRUD — Model, Migration, Controller, Resource, Policy, Factory, Seeder |
| 4 | `errors-test` | false | HTTP error handlers, custom routes, arkzenFetch interceptor |
| 5 | `events-test` | false | Laravel Events + Listeners, event log table, async chain |
| 6 | `inventory-management` | false | Multi-table CRUD, seeded data, paginated table UI |
| 7 | `job-test` | false | Laravel Queue Jobs, sync/default/failed queues, job result tracking |
| 8 | `mail-test` | true | Laravel Mail (SMTP), mail logs table, auth-scoped send |
| 9 | `notification-test` | true | Database + mail + broadcast notifications, native notifications table |
| 10 | `roles-test` | true | Admin/user roles, role-gated routes, promote/demote, audit log |
| 11 | `scheduler-test` | false | Console commands, scheduler, manual run via `run` endpoint type |
| 12 | `middleware-test` | false | Custom middleware body injection, alias registration, runtime validation |

---

## SECTION 25 — COMPLETE EXAMPLE: auth:false Tatemono (v6.1 Design Standard)

```tsx
/* @arkzen:meta
name: inventory-management
version: 3.0.0
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
import { Plus, Edit2, Trash2, Package, Search } from 'lucide-react'
import { Modal }       from '@/arkzen/core/components/Modal'
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
  const [search, setSearch]       = useState('')
  const [form, setForm]           = useState({ name: '', sku: '', quantity: '0', price: '0', category: '' })

  const { data, refetch } = useQuery<{ data: InventoryItem[] }>('/api/inventories')
  const items = (data?.data ?? []).filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase())
  )

  const { mutate: save, isLoading: saving } = useMutation({
    method:      editing ? 'PUT' : 'POST',
    invalidates: ['/api/inventories'],
    onSuccess:   () => { toast.success(editing ? 'Item updated' : 'Item created'); setModalOpen(false); refetch() },
    onError:     () => toast.error('Failed to save item'),
  })

  const { mutate: remove } = useMutation({
    method:      'DELETE',
    invalidates: ['/api/inventories'],
    onSuccess:   () => { toast.success('Item deleted'); refetch() },
  })

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', sku: '', quantity: '0', price: '0', category: '' })
    setModalOpen(true)
  }
  const openEdit = (item: InventoryItem) => {
    setEditing(item)
    setForm({ name: item.name, sku: item.sku, quantity: String(item.quantity), price: String(item.price), category: item.category ?? '' })
    setModalOpen(true)
  }

  return (
    <div className="arkzen-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Inventory</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{items.length} items tracked</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-neutral-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-neutral-800 transition-colors flex items-center gap-2"
        >
          <Plus size={15} /> Add Item
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or SKU..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-lg bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-colors"
        />
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100">
              {['Item', 'SKU', 'Qty', 'Price', 'Category', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Package size={32} className="mx-auto text-neutral-300 mb-2" />
                  <p className="text-sm text-neutral-400">No items found</p>
                </td>
              </tr>
            ) : items.map(item => (
              <tr key={item.id} className="border-b border-neutral-50 hover:bg-neutral-50 transition-colors">
                <td className="px-4 py-3.5 font-medium text-neutral-800">{item.name}</td>
                <td className="px-4 py-3.5 font-mono text-xs text-neutral-500">{item.sku}</td>
                <td className="px-4 py-3.5 text-neutral-700">{item.quantity}</td>
                <td className="px-4 py-3.5 text-neutral-700">${Number(item.price).toFixed(2)}</td>
                <td className="px-4 py-3.5">
                  {item.category ? (
                    <span className="text-xs font-medium bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">{item.category}</span>
                  ) : (
                    <span className="text-neutral-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(item)} className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => remove(`/api/inventories/${item.id}`, {})} className="p-1.5 rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 size={13} />
                    </button>
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
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 border border-neutral-200 text-neutral-700 text-sm font-medium py-2 rounded-lg hover:bg-neutral-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={() => save(
                editing ? `/api/inventories/${editing.id}` : '/api/inventories',
                { ...form, quantity: parseInt(form.quantity), price: parseFloat(form.price) }
              )}
              disabled={saving}
              className="flex-1 bg-neutral-900 text-white text-sm font-medium py-2 rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </button>
          </div>
        )}
      >
        <div className="space-y-3">
          <input className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-colors" placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-colors disabled:bg-neutral-50 disabled:text-neutral-400" placeholder="SKU" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} disabled={!!editing} />
          <div className="grid grid-cols-2 gap-3">
            <input className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-colors" type="number" placeholder="Quantity" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            <input className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-colors" type="number" placeholder="Price" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
          </div>
          <input className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-colors" placeholder="Category (optional)" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
        </div>
      </Modal>
    </div>
  )
}
/* @arkzen:page:index:end */
```

---

## SECTION 26 — v6.0 → v6.1 CHANGES

| Feature | v6.0 | v6.1 |
|---------|------|------|
| `@arkzen:middleware` | Undocumented — existed in codebase as MiddlewareBuilder v7.0 but never described in guidelines | **Fully documented** in Section 10 — named `:end` block, full PHP `handle()` body injection, built-in list, alias auto-registration |
| `@arkzen:listener:Name` | Undocumented — ListenerBuilder v3.2 had body injection but no DSL documentation | **Fully documented** in Section 12 — named `:end` block, PHP `handle(Event $event)` body injection |
| `@arkzen:endpoint:name` | Undocumented — ControllerBuilder v5.8 had injection for custom endpoint methods | **Fully documented** in Section 8 — named `:end` block, PHP body injection for non-CRUD endpoints |
| `@arkzen:handler:name` | Undocumented — CustomRouteBuilder v2.0 had injection for route handler methods | **Fully documented** in Section 9 — named `:end` block, PHP body injection for custom route handlers |
| `@arkzen:notifications` | Documented as "YAML only" | **Corrected** — partial body injection since NotificationBuilder v3.9. PHP body between `*/` and `:end` is injected into `toMail()`. `toBroadcast()` and `toArray()` remain fixed. |
| `@arkzen:mail` | Documented as "YAML only" | **Corrected** — partial body injection since MailBuilder v3.1. HTML/Blade body between `*/` and `:end` is written as the Blade view file. Mailable class structure remains fixed. |
| Section order in file | Did not include middleware, listener, endpoint, handler markers | **Updated** Section 3 and Section 23 with all new markers in correct order |
| DSL body injection reference | No consolidated table | **New Section 18B** — complete table of all blocks, injection status, what is injected, fallback |
| NEVER DO rules | 39 rules | **Updated to 44 rules** — added rules 40–44 covering new DSL blocks |
| Backend bridge | `middlewareSnippets` parsed by parser but never sent to Laravel — MiddlewareBuilder always fell through to TODO stub | **Fixed** in bridge v5.4 — `middlewareSnippets` added to payload and `hasBackend` check |
| Blueprint #12 | `upload-test` | **Replaced with `middleware-test`** — validates full middleware body injection pipeline |
