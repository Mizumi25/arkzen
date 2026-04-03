Here's your UPDATED README for Arkzen v4.0:

```markdown
# ARKZEN ENGINE v4.0

## Full Stack Business System Generator

**One Tatemono file = One complete client system.**

---

## WHAT IS ARKZEN

Arkzen is a full stack scaffolding engine that generates complete Laravel + Next.js applications from a single file format called a **Tatemono**.

Drop a `.tsx` file into the watcher, and Arkzen automatically builds:

- ✅ Database migrations (multiple tables with relationships)
- ✅ Eloquent models with fillable, casts, relations
- ✅ API controllers with validation, search, filter, pagination
- ✅ API routes with middleware
- ✅ Form Requests, Policies, Resources
- ✅ Seeders + Factories
- ✅ Next.js pages with Tailwind CSS
- ✅ GSAP animations
- ✅ Authentication (Laravel Sanctum)
- ✅ Real-time WebSockets (Laravel Reverb + CRDTs)
- ✅ Background Jobs, Events, Listeners
- ✅ Email Notifications + Mailables
- ✅ Artisan commands

**One file. Full stack. Production ready.**

---

## THE TATEMONO FORMAT

A Tatemono is a single `.tsx` file with marked sections:

```tsx
/* @arkzen:meta
name: inventory-management
version: 1.0.0
description: Full inventory management
layout: base
auth: false
*/

/* @arkzen:database
table: inventories
timestamps: true
columns:
  id: integer|primary|auto
  name: string|length:255|nullable:false
  sku: string|length:100|unique|nullable:false
  quantity: integer|default:0
  price: decimal|precision:10|scale:2
  category: string|length:100|nullable
  description: text|nullable
*/

/* @arkzen:api
model: Inventory
controller: InventoryController
prefix: /api/inventories
endpoints:
  index: GET|/|paginated
  show: GET|/{id}|single
  store: POST|/|Create item
  update: PUT|/{id}|Update item
  destroy: DELETE|/{id}|Delete item
*/

/* @arkzen:components */
'use client'
import { useState } from 'react'
import { Modal, Dialog, Badge, useToast } from '@/arkzen/core/components'
// Your React components here

/* @arkzen:page */
const InventoryManagementPage = () => {
  // Your page logic here
}

/* @arkzen:animation */
import { gsap } from 'gsap'
// Your GSAP animations here
```

One Tatemono = multiple tables, multiple API resources, full frontend, animations, real-time, jobs, notifications — everything.

---

PROJECT STRUCTURE

```
arkzen/
├── engine/
│   ├── frontend/              → Next.js + Watcher
│   │   ├── app/               → Generated pages
│   │   ├── arkzen/
│   │   │   ├── core/
│   │   │   │   ├── layouts/   → BaseLayout, AuthLayout, BlankLayout
│   │   │   │   ├── components/→ Modal, Dialog, Table, Toast, etc.
│   │   │   │   ├── hooks/     → useQuery, useMutation, useWebSocket, useCRDT
│   │   │   │   └── stores/    → useAuthStore (Zustand)
│   │   │   └── generated/     → Animation files
│   │   └── tatemono/          → Watcher folder (drop tatemonos here)
│   └── backend/               → Laravel + Builders
│       ├── app/Arkzen/
│       │   ├── Builders/      → 20+ code generators
│       │   └── Readers/       → ModuleReader
│       └── routes/modules/    → Generated API routes
├── tatemonos/                 → Source tatemonos (your blueprints)
├── projects/                  → Exported client projects (standalone)
├── setup.js                   → One-time engine setup
├── start.js                   → Start development server
├── new.js                     → Create new client project
├── export.js                  → Export tatemono as standalone project
└── arkzen.json                → Registry of active tatemonos
```

---

QUICK START

1. Install Dependencies

```bash
# Prerequisites
node, npm, php, composer

# Clone and setup
git clone arkzen
cd arkzen
node setup.js
```

2. Start the Engine

```bash
node start.js
```

3. Generate a Tatemono

Open Claude with the Arkzen Guidelines and paste your client requirements.

Claude generates a complete Tatemono .tsx file.

4. Drop & Build

```bash
# Copy to watcher folder
cp tatemono-name.tsx engine/frontend/tatemono/

# Engine automatically:
# - Parses the file
# - Generates Laravel backend (migrations, models, controllers, routes)
# - Generates Next.js frontend (page, components, animations)
# - Runs migrations + seeders
# - Hot reloads the browser
```

5. View Your System

```
Frontend: http://localhost:3000/tatemono-name
Backend:  http://localhost:8000/api/...
```

---

COMMANDS

Command Purpose
node setup.js One-time engine installation
node start.js Start development server (watcher + backend)
node new.js project-name Create new empty client project
node export.js tatemono-name Export tatemono as standalone project

---

EXPORT TO CLIENT

When a client needs their system:

```bash
node export.js client-system
cd projects/client-system
node start.js
```

Client receives:

· ✅ Complete Laravel + Next.js codebase
· ✅ No vendor lock-in
· ✅ Can host anywhere
· ✅ Full ownership

---

TATEMONO SECTIONS (v4.0)

Section Purpose Repeat
@arkzen:meta Identity, layout, auth Once
@arkzen:config Component overrides Once (optional)
@arkzen:database Database table definition Per table
@arkzen:api API resource definition Per resource
@arkzen:store Zustand global state Once (optional)
@arkzen:realtime Reverb channels + CRDT Once (optional)
@arkzen:events Laravel events Once (optional)
@arkzen:jobs Background jobs Once (optional)
@arkzen:notifications Email/database notifications Once (optional)
@arkzen:mail Mailables Once (optional)
@arkzen:console Artisan commands Once (optional)
@arkzen:components React imports + components Once
@arkzen:page Next.js page component Once
@arkzen:animation GSAP animations Once (optional)

---

AVAILABLE FRONTEND IMPORTS

Components

```tsx
import { Modal, Drawer, Dialog, Table, Toast, Pagination, Breadcrumb } from '@/arkzen/core/components'
import { Badge, Avatar, Tooltip, Field, Form } from '@/arkzen/core/components/utils'
import { Chart, SortableList, FileUpload, RichTextEditor, Map } from '@/arkzen/core/components'
```

Hooks

```tsx
import { useQuery } from '@/arkzen/core/hooks/useQuery'           // GET + cache
import { useMutation } from '@/arkzen/core/hooks/useMutation'     // POST/PUT/DELETE
import { useWebSocket } from '@/arkzen/core/hooks/useWebSocket'   // Reverb
import { useCRDT } from '@/arkzen/core/hooks/useCRDT'             // Conflict-free sync
import { useToast } from '@/arkzen/core/components/Toast'
```

Auth

```tsx
import { useAuthStore, arkzenFetch } from '@/arkzen/core/stores/authStore'
```

---

LAYOUTS (3-Tier Customization)

Tier 1: Default

```tsx
<BaseLayout>Your content</BaseLayout>
```

Tier 2: Configured

```tsx
<BaseLayout 
  brandName="ClientCo"
  navItems={[{ label: 'Dashboard', href: '/', icon: <LayoutDashboard /> }]}
  userName="Juan"
/>
```

Tier 3: Full Custom (Slot Overrides)

```tsx
<BaseLayout 
  sidebar={<MyCustomSidebar />}
  topbar={<MyCustomTopbar />}
>
  {children}
</BaseLayout>
```

Available layouts: BaseLayout, AuthLayout, BlankLayout

---

BUILT-IN FEATURES

Feature Status Description
Authentication ✅ Laravel Sanctum + Zustand store
Real-time ✅ Laravel Reverb + WebSocket hook
Conflict-free sync ✅ CRDT with LWW
Background jobs ✅ Laravel queues
Events + Listeners ✅ Event-driven architecture
Notifications ✅ Database + Mail
Email ✅ Mailables + Blade views
API Resources ✅ Transform responses
Policies ✅ Authorization
Form Requests ✅ Validation
Seeders + Factories ✅ Test data
Dark mode ✅ Tailwind dark:
GSAP Animations ✅ ScrollTrigger + page transitions

---

ENVIRONMENT VARIABLES

Create .env.local in engine/frontend/:

```env
ARKZEN_BACKEND_URL=http://localhost:8000
ARKZEN_ENGINE_SECRET=arkzen-secret-123
FRONTEND_PORT=3000
NEXT_PUBLIC_REVERB_HOST=localhost
NEXT_PUBLIC_REVERB_PORT=8080
```

---

REGISTRY

arkzen.json at project root tracks all active tatemonos:

```json
{
  "engine": "4.0.0",
  "project": "arkzen-engine",
  "modules": [
    {
      "name": "inventory-management",
      "version": "1.0.0",
      "status": "active",
      "registered": "2026-04-02T06:37:24.977Z"
    }
  ]
}
```

Never edit manually — the engine manages it automatically.

---

COMPLETE WORKFLOW

```
1. Client: "I need a project management system"
   ↓
2. Claude + Guidelines generates Tatemono (5 minutes)
   ↓
3. Drop into engine/frontend/tatemono/
   ↓
4. Arkzen builds:
   - Laravel: migrations, models, controllers, routes, seeders
   - Next.js: page, components, animations
   ↓
5. System live at localhost:3000/project-management
   ↓
6. Export to client: node export.js project-management
   ↓
7. Client runs: cd projects/project-management && node start.js
   ↓
8. Client owns the code. You get paid.
```

---

VERSION HISTORY

Version Features
v1.0 Single-table CRUD generator
v2.0 Multi-table support + API resources
v3.0 Builders for policies, requests, factories
v4.0 Real-time (Reverb + CRDT), jobs, events, notifications, mail, console commands, 3-tier layouts

---

LICENSE

Proprietary — Arkzen Engine is a private tool. Not for redistribution.

---

BUILT WITH

· Frontend: Next.js 16, TypeScript, Tailwind CSS, Zustand, GSAP, Framer Motion
· Backend: Laravel 13, SQLite, Sanctum, Reverb
· Builders: 20+ Laravel code generators
· Watcher: Chokidar

```
