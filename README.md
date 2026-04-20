# ARKZEN ENGINE v4.0

Arkzen is a **full-stack code generator**: one Tatemono file (`.tsx`) defines a complete client system, and the engine generates both the Laravel backend and Next.js frontend.

---

## Architecture Overview

### Frontend Engine
- **Stack:** Next.js 16, TypeScript, Tailwind CSS, Zustand
- **Watcher pipeline:** reads `tatemonos/<name>/core.tsx`, parses `@arkzen:*` sections, and generates app pages/components
- **Core UI/runtime:** reusable layouts, components, hooks, auth store, parser, router, and build bridge under `engine/frontend/arkzen/core`

### Backend Engine
- **Stack:** Laravel 13 + Sanctum + Reverb
- **Database model:** SQLite isolation per tatemono/client output
- **Generation flow:** module reading + typed section parsing + builder execution

### Builders System (20+)
From `engine/backend/app/Arkzen/Builders`:
- AuthBuilder
- MigrationBuilder
- ControllerBuilder
- JobBuilder
- ConsoleBuilder
- MailBuilder
- EventBuilder
- NotificationBuilder
- BroadcastBuilder
- ChannelBuilder
- RouteRegistrar
- SeederBuilder
- ModelBuilder
- ResourceBuilder
- PolicyBuilder
- FactoryBuilder
- RequestBuilder
- ListenerBuilder
- CustomRouteBuilder
- MiddlewareBuilder
- ArkzenYaml

---

## v6 Syntax Standards (Section Order)

Use sections in this order:

1. `@arkzen:meta` (identity)
2. `@arkzen:config` (optional)
3. `@arkzen:database:identifier` (repeat, multi-table)
4. `@arkzen:api:identifier` (repeat, REST endpoints)
5. `@arkzen:routes` (optional, custom routes)
6. `@arkzen:store:identifier` (optional, Zustand)
7. `@arkzen:realtime:identifier` (optional, WebSocket)
8. `@arkzen:events:identifier` (optional, event listeners)
9. `@arkzen:jobs:identifier` (optional, queue jobs with `handle()` PHP body)
10. `@arkzen:notifications:identifier` (optional, email/database notifications)
11. `@arkzen:mail:identifier` (optional, mailables)
12. `@arkzen:console:identifier` (optional, Artisan commands with cron schedule)
13. `@arkzen:layout:name` (optional, custom layouts)
14. `@arkzen:components:identifier` (repeat, imports and custom components)
15. `@arkzen:page:name` (repeat, one per page)
16. `@arkzen:error:404` (optional, 404 handler)
17. `@arkzen:error:500` (optional, 500 handler)
18. `@arkzen:animation` (optional, GSAP animations)

---

## Design Aesthetic (v6)

Arkzen follows an Apple-minimalist, Awwwards-quality style baseline:
- Whitespace over clutter
- Neutral palette (`white`, `off-white`, `neutral-50/100/200`)
- One accent color maximum per tatemono
- Tailwind CSS required
- Icons: **Lucide React** primary, **Hero Icons** secondary fallback

---

## 12 Active Tatemono References

All references are in `tatemonos/<name>/core.tsx`:

1. **inventory-management (v2.0.0)** — CRUD inventory flow + seeding
2. **auth-test (v1.0.0)** — Sanctum auth flows (register/login/logout/protected pages)
3. **broadcast-test (v2.0.0)** — real-time WebSocket channels (public/private/presence)
4. **crud-test (v1.0.0)** — basic CRUD pipeline verification
5. **events-test (v1.0.0)** — Laravel events + listeners handling
6. **job-test (v1.0.0)** — queue jobs with multiple job types
7. **notification-test (v2.1.0)** — email/database/broadcast notifications
8. **roles-test (v2.0.0)** — role-based access control with auth
9. **upload-test (v1.0.0)** — file uploads (single/multiple, preview/download/delete)
10. **scheduler-test (v2.0.0)** — Artisan commands + cron scheduling
11. **errors-test (v1.0.0)** — 404/500 handling and error simulation
12. **mail-test (v2.0.0)** — named Mailables and email templates

---

## Quick Start

```bash
git clone https://github.com/Mizumi25/arkzen
cd arkzen
node setup.js
node start.js
```

Then:
1. Create/update a tatemono in `tatemonos/<your-system>/core.tsx`
2. Ensure engine watcher receives the module through `engine/frontend/tatemono/`
3. Arkzen generates backend + frontend artifacts automatically

---

## Key Features (Auto-Generated)

- Multi-table migrations
- Eloquent models
- API controllers + route registration
- Form Requests, Resources, Policies
- Seeders + Factories
- Auth scaffolding (Sanctum)
- Realtime channels + broadcasts
- Events + listeners
- Jobs + queue-ready classes
- Notifications + Mailables
- Artisan console commands + scheduling
- Frontend pages/components/hooks/layout wiring

---

## Export & Deployment

Export a tatemono as a standalone project:

```bash
node export.js <tatemono-name>
cd projects/<tatemono-name>
node start.js
```

Clients receive a standalone Laravel + Next.js codebase they can host independently.

---

## Available Imports (`@/arkzen/core`)

### Components (`@/arkzen/core/components`)
- Modal, Drawer, Toast, useToast, Dialog, Tooltip
- Breadcrumb, Table, Form, Field, Pagination
- Loading, PageTransition, Badge, Avatar, EmptyState

### Hooks
- `@/arkzen/core/hooks/useQuery`
- `@/arkzen/core/hooks/useMutation`
- `@/arkzen/core/hooks/useWebSocket`
- `@/arkzen/core/hooks/useCRDT`

### Auth / Store
- `@/arkzen/core/stores/authStore` (`useAuthStore`, `arkzenFetch`)

### Icons
- Primary: `lucide-react`
- Secondary fallback: `@heroicons/react`

---

## Engine Commands

- `node setup.js` — install and initialize Arkzen engine
- `node start.js` — run frontend + backend + queue + reverb services
- `node new.js <project-name>` — scaffold a new project container
- `node export.js <tatemono-name>` — export standalone deployable output
