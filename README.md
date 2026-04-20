# ARKZEN Engine v6.0

Arkzen is a **full-stack scaffolding engine** that turns a single Tatemono blueprint into a complete Laravel + Next.js system.

> **Core value proposition:** **One Tatemono file = one complete production-ready system.**

---

## 1) Modern Introduction

ARKZEN Engine v4.0 watches Tatemono files and generates:

- Laravel backend code (migrations, models, controllers, requests, resources, policies, jobs, events, listeners, notifications, mailables, console commands, routes)
- Next.js frontend code (pages, components, stores, realtime hooks, animations)
- Registry and exportable project structure for standalone delivery

A Tatemono is the source of truth. Arkzen distributes instructions to frontend + backend builders and keeps the generated system isolated per module.

---

## 2) Stack Information

### Frontend

- **Next.js 16**
- **TypeScript**
- **Tailwind CSS**
- **Zustand**

### Backend

- **Laravel 13**
- **SQLite per tatemono (isolated data boundary)**
- **Laravel Sanctum** for auth
- Laravel Reverb for realtime channels

---

## 3) Architecture Diagram

```text
/home/runner/work/arkzen/arkzen
├── engine/
│   ├── frontend/                    # Next.js app + parser/watcher/builder bridge
│   │   ├── app/                     # Generated routes/pages
│   │   ├── arkzen/core/             # Core components/hooks/layouts/store
│   │   ├── tatemono/                # Watch folder for active build input
│   │   └── validate.js
│   └── backend/                     # Laravel app + Arkzen builders
│       ├── app/Arkzen/Builders/     # Backend code generation pipeline
│       ├── app/Arkzen/Readers/
│       ├── routes/modules/          # Generated API route files
│       ├── database/migrations/arkzen/
│       └── database/seeders/arkzen/
├── tatemonos/                       # Canonical blueprint source: <name>/core.tsx
├── projects/                        # Exported standalone projects
├── setup.js                         # Engine bootstrap
├── start.js                         # Run backend + queue + reverb + frontend
└── export.js                        # Export one tatemono as project
```

---

## 4) Backend Builder Pipeline (20+)

Located in `engine/backend/app/Arkzen/Builders`:

1. `AuthBuilder` — per-tatemono auth stack (Sanctum, auth routes, auth flow)
2. `MigrationBuilder` — migration generation
3. `ControllerBuilder` — API controllers
4. `JobBuilder` — queued job classes from `@arkzen:jobs:*`
5. `ConsoleBuilder` — Artisan commands + schedule metadata
6. `MailBuilder` — mailable classes/views
7. `EventBuilder` — event classes
8. `NotificationBuilder` — notification classes/channels
9. `BroadcastBuilder` — broadcast event generation
10. `ChannelBuilder` — channel authorization files
11. `RouteRegistrar` — module route registration wiring
12. `SeederBuilder` — seeders from Tatemono data
13. `ModelBuilder` — Eloquent models/relations/casts
14. `ResourceBuilder` — API resources (transformers)
15. `PolicyBuilder` — authorization policies
16. `FactoryBuilder` — model factories
17. `RequestBuilder` — Form Request validation classes
18. `ListenerBuilder` — event listener classes
19. `CustomRouteBuilder` — custom `@arkzen:routes` endpoints
20. `MiddlewareBuilder` — middleware artifacts/registrations
21. `ArkzenYaml` — YAML parse/normalization helper for builder inputs

Readers used by the pipeline:

- `ModuleReader`
- `RegistryReader`

---

## 5) v6 Tatemono Syntax (Section Order)

Follow this exact order (from `ARKZEN_GUIDELINES_v6.md`):

1. `@arkzen:meta` — identity (`name`, `version`, `description`, `auth`)
2. `@arkzen:config` *(optional)* — component/layout tuning
3. `@arkzen:database:identifier` *(repeat)* — table schema definitions
4. `@arkzen:api:identifier` *(repeat)* — REST resource endpoints
5. `@arkzen:routes` *(optional)* — custom backend routes
6. `@arkzen:store:identifier` *(repeat)* — Zustand stores
7. `@arkzen:realtime:identifier` *(repeat)* — WebSocket/Reverb channels/events
8. `@arkzen:events:identifier` *(repeat)* — events and listeners
9. `@arkzen:jobs:identifier` *(repeat)* — queue jobs (with PHP `handle()` body)
10. `@arkzen:notifications:identifier` *(repeat)* — mail/database/broadcast notifications
11. `@arkzen:mail:identifier` *(repeat)* — mailables/templates
12. `@arkzen:console:identifier` *(repeat)* — Artisan commands + cron schedule
13. `@arkzen:layout:name` *(repeat)* — custom layout blocks
14. `@arkzen:components:identifier` *(repeat)* — imports + reusable components
15. `@arkzen:page:name` *(repeat)* — page definitions and layout binding
16. `@arkzen:error:404` *(optional)* — custom 404 behavior
17. `@arkzen:error:500` *(optional)* — custom 500 behavior
18. `@arkzen:animation` *(optional)* — GSAP animation block

---

## 6) Design Standards

ARKZEN v6 design policy:

- **Apple-minimalist aesthetic** (clean spacing, restrained visual noise)
- **Tailwind CSS** as the required styling system
- **Lucide React** icons for UI iconography

---

## 7) 12 Active Tatemono Blueprints

From `/home/runner/work/arkzen/arkzen/tatemonos`:

1. `inventory-management` (**v2.0.0**) — CRUD with seeding
2. `auth-test` (**v1.0.0**) — Sanctum authentication
3. `broadcast-test` (**v2.0.0**) — realtime WebSocket
4. `crud-test` (**v1.0.0**) — basic CRUD operations
5. `events-test` (**v1.0.0**) — event handling
6. `job-test` (**v1.0.0**) — queue jobs (`process-data`, `heavy-computation`, `always-fails`)
7. `notification-test` (**v2.1.0**) — email/database notifications
8. `roles-test` (**v2.0.0**) — role-based access control
9. `upload-test` (**v1.0.0**) — file uploads
10. `scheduler-test` (**v2.0.0**) — task scheduling with cron
11. `errors-test` (**v1.0.0**) — error simulation and handling
12. `mail-test` (**v2.0.0**) — email templates and mailables

---

## 8) Quick Start

```bash
cd /home/runner/work/arkzen/arkzen
node setup.js
node start.js
```

Optional validation (frontend parser validator):

```bash
cd /home/runner/work/arkzen/arkzen/engine/frontend
node validate.js <tatemono-name>
```

---

## 9) Workflow (Create → Build → Export)

1. Create blueprint at `tatemonos/<name>/core.tsx`
2. Ensure it follows v6 marker order and syntax
3. Place/copy active build input into `engine/frontend/tatemono/`
4. Run engine (`node start.js`) for generation and hot rebuild
5. Export standalone project:

```bash
cd /home/runner/work/arkzen/arkzen
node export.js <tatemono-name>
```

6. Open exported project in `projects/<tatemono-name>/`

---

## 10) Available Imports

### Components (`@/arkzen/core/components`)

```tsx
import {
  Modal, Drawer, Toast, useToast, Dialog, Tooltip, Breadcrumb,
  Table, Form, Field, Pagination, Loading, PageTransition,
  Badge, Avatar, EmptyState
} from '@/arkzen/core/components'
```

### Hooks (`@/arkzen/core/hooks/*`)

```tsx
import { useQuery } from '@/arkzen/core/hooks/useQuery'
import { useMutation } from '@/arkzen/core/hooks/useMutation'
import { useWebSocket } from '@/arkzen/core/hooks/useWebSocket'
import { useCRDT } from '@/arkzen/core/hooks/useCRDT'
```

### Auth Store

```tsx
import { useAuthStore, arkzenFetch } from '@/arkzen/core/stores/authStore'
```

### Icons

```tsx
import { Bell, Shield, Boxes, Mail } from 'lucide-react'
```

---

## 11) Environment Variables

### Frontend (`engine/frontend/.env.local`)

```env
ARKZEN_BACKEND_URL=http://localhost:8000
ARKZEN_ENGINE_SECRET=arkzen-secret-123
NEXT_PUBLIC_REVERB_HOST=localhost
NEXT_PUBLIC_REVERB_PORT=8080
NEXT_PUBLIC_REVERB_SCHEME=ws
NEXT_PUBLIC_REVERB_APP_KEY=arkzen-key
```

### Backend (`engine/backend/.env`)

```env
APP_URL=http://localhost:8000
DB_CONNECTION=sqlite
DB_DATABASE=/absolute/path/to/engine/backend/database/database.sqlite
ARKZEN_ENGINE_SECRET=arkzen-secret-123

REVERB_APP_ID=arkzen
REVERB_APP_KEY=arkzen-key
REVERB_APP_SECRET=arkzen-secret
REVERB_HOST=localhost
REVERB_PORT=8080
REVERB_SCHEME=http
```

---

## 12) Engine Commands

```bash
node setup.js                 # one-time setup
node start.js                 # start frontend + backend + queue + reverb
node new.js <project-name>    # scaffold a fresh project
node export.js <tatemono>     # export one tatemono as standalone project
```

---

## 13) Notes

- `arkzen.json` is engine-managed registry metadata.
- Keep Tatemono names lowercase-hyphen format.
- Prefer one isolated domain system per Tatemono.
