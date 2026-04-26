# ARKZEN ROADMAP — Version 8 & 9

## Current Status
**Version 7 (Current)**: Next.js 16 + TypeScript + Laravel 13 ✓ COMPLETE
- ✓ Component separation (individual component files + shared utilities backend)
- ✓ CSS/Style DSL (global + per-component CSS Modules)
- ✓ Multiple pages per tatemono
- ✓ Full auth system (Sanctum + roles)
- ✓ API generation (REST + custom routes)
- ✓ Real-time (Reverb + CRDT)
- ✓ Background jobs (queue workers)
- ✓ Events, listeners, notifications, mail
- ✓ Middleware + custom route handlers
- ✓ Asset management + favicon
- ✓ Animations (GSAP + Framer Motion)
- ✓ Full code generation from single tatemono file
- ✓ Zero hardcoding philosophy

**Power Level**: 9/10 — Enterprise-grade full-stack scaffolding

---

## Version 8 — Inertia.js Support (React + Laravel)

### Why Inertia.js?
- React on the frontend + Laravel backend (no separate API)
- Server-side rendered React components
- Faster initial load than SPA
- Better SEO than Next.js SPA
- Simpler setup than separate API + frontend

### New Capabilities
```
├── Frontend Stack
│   └── React 18 + TypeScript (Inertia.js)
│       - No Next.js
│       - Laravel serves React components
│       - Vite for build
│       - Automatic code splitting
│
├── Backend (Same as v7)
│   └── Laravel 13 (with Inertia route helpers)
│       - @inertia() response helper
│       - Automatic props merging
│       - Server-side validation errors → frontend
│
├── Routing
│   └── Pure Laravel routes (no Next.js routing)
│       - route('dashboard') generates links
│       - Inertia handles navigation
│
├── Page Generation
│   └── @arkzen:page blocks → React/Inertia pages
│       - Auto-wired to Laravel routes
│       - Props typed with TypeScript
│       - Automatic form handling with Inertia
│
├── Component System
│   └── Same as v7 (individual files + shared utilities)
│
└── Styling
    └── Same as v7 (CSS DSL + Tailwind)
```

### Implementation Plan
1. **Phase 1**: Create `Inertia.ts` builder (Phase 8.1)
   - Parse @arkzen:page blocks → React Inertia components
   - Generate `resources/js/Pages/*.tsx`
   - Auto-wire to Laravel routes

2. **Phase 2**: Route registration (Phase 8.2)
   - Inertia route helpers
   - Automatic route generation from pages
   - Props type definitions

3. **Phase 3**: Form handling (Phase 8.3)
   - useForm hook integration
   - Automatic validation error display
   - Server-side CSRF handling

4. **Phase 4**: Real-time support (Phase 8.4)
   - Laravel Echo for Reverb
   - Real-time updates without WebSocket wrapper

5. **Phase 5**: Asset management (Phase 8.5)
   - Vite asset pipeline
   - Favicon + static file serving

### What Stays the Same
- Tatemono file format (@arkzen:* blocks)
- Component separation strategy
- CSS/Style DSL
- Auth system (Sanctum works with Inertia)
- Real-time (Reverb)
- Jobs, events, notifications
- Generator logic (Phase builders)

### What Changes
- Frontend build: Vite instead of Next.js webpack
- Routing: Laravel routes instead of Next.js routing
- Page location: `resources/js/Pages/` instead of `app/`
- Entry point: Single `app.blade.php` instead of per-page `page.tsx`

---

## Version 9 — React Native Support

### Why React Native?
- Cross-platform: iOS + Android from single codebase
- Reuse React skills
- Native performance
- Real-time sync with backend

### New Capabilities
```
├── Frontend Stack
│   └── React Native (Expo or bare)
│       - TypeScript
│       - React Navigation
│       - Native UI components
│       - Async storage
│
├── Backend (Same as v7/v8)
│   └── Laravel 13
│       - Same API endpoints
│       - Sanctum auth still works
│
├── API Usage
│   └── @arkzen:api blocks → Mobile-ready endpoints
│       - JSON responses (already compatible)
│       - Upload handling (image + document)
│       - Offline-first support
│
├── Component System
│   └── React Native components (not web components)
│       - <View>, <Text>, <FlatList>, etc.
│       - Same separation strategy (individual files)
│
├── Styling
│   └── React Native StyleSheet
│       - No CSS/Tailwind (not applicable to native)
│       - Design tokens as JS constants
│
└── Real-time
    └── WebSocket (native-compatible)
        - Same Reverb backend
        - React Native hooks for subscribers
```

### Implementation Plan
1. **Phase 1**: Create `ReactNative.ts` builder (Phase 9.1)
   - Parse @arkzen:page blocks → React Native screens
   - Component generation for native
   - Navigation setup

2. **Phase 2**: Navigation (Phase 9.2)
   - React Navigation integration
   - Automatic route generation
   - Deep linking support

3. **Phase 3**: API/Auth (Phase 9.3)
   - Same arkzenFetch for mobile
   - Sanctum auth (with secure storage)
   - Token refresh on mobile

4. **Phase 4**: Real-time (Phase 9.4)
   - WebSocket subscriptions
   - Background notifications
   - Offline queue + sync

5. **Phase 5**: Assets + Build (Phase 9.5)
   - Asset management (images, fonts)
   - Expo build config generation
   - Auto-generated app.json

### What Stays the Same
- Tatemono file format
- Backend (@arkzen:api, @arkzen:database, etc.)
- Component separation strategy (but native components)
- Auth system (Sanctum)
- Real-time (Reverb)
- Generator architecture

### What Changes
- Frontend framework: React Native instead of React Web
- Routing: React Navigation instead of file-based
- Styling: React Native StyleSheet instead of CSS
- Component location: `src/Screens/` and `src/Components/`
- Build: Expo/native toolchain instead of Next.js/Vite

---

## Roadmap Timeline

| Version | Frontend | Backend | Status | Timeline |
|---------|----------|---------|--------|----------|
| v7 (Current) | Next.js 16 | Laravel 13 | ✓ Complete | Now |
| v8 | Inertia.js (React) | Laravel 13 | Planned | 2-3 months |
| v9 | React Native | Laravel 13 | Planned | 3-4 months after v8 |

---

## Why Arkzen is Powerful

### Current Advantages (v7)
1. **Single-file generation** — One tatemono = complete system
2. **Zero hardcoding** — All generated from DSL
3. **Component separation** — Individual files + shared utilities (no import chaos)
4. **CSS DSL** — Global variables + per-component modules (design tokens built-in)
5. **Full-stack** — Database, API, pages, components, auth, real-time, jobs, events, mail
6. **TypeScript everywhere** — Type-safe from frontend to backend
7. **Multi-page support** — Multiple routes, layouts, custom components
8. **Enterprise features** — Roles, middleware, policies, factories, seeders
9. **Real-time ready** — Reverb + CRDT for conflict-free sync
10. **Async operations** — Queue workers, jobs, background processing

### Why v8 + v9 Make It Even More Powerful
- **Framework flexibility** — Choose frontend (Next.js, Inertia, React Native)
- **True full-stack** — Same tatemono generates different frontends
- **Code reuse** — React component logic can be shared across web + mobile
- **Single backend** — One Laravel backend, multiple frontend targets
- **Future-proof** — Expandable to Vue, Svelte, etc.

**Arkzen will be the first full-stack scaffolder that generates:**
- Web SPAs (Next.js)
- Server-rendered apps (Inertia.js)
- Native mobile apps (React Native)
- **All from a single tatemono file**

### Power Rating
- **v7**: 9/10 (Enterprise web apps)
- **v8**: 9.5/10 (Web apps + server-rendered + mobile web)
- **v9**: 10/10 (Complete ecosystem — web + mobile native)

---

## Implementation Strategy

### Phase Builders (Already Exist)
All phases follow the same pattern:
```
Phase X.Y: Feature Name
├── Input: ParsedTatemono (from parser.ts)
├── Processing: Extract + transform data
├── Output: Generated files (PHP, TSX, CSS, config)
└── Side effects: Register routes, update imports, etc.
```

### Adding New Frameworks (v8-v9)
1. Create new builder file: `InertiaBuilder.ts`, `ReactNativeBuilder.ts`
2. Create new type: `InertiaPage`, `NativeScreen`
3. Update parser to detect `@arkzen:page:* /* @arkzen:page:framework:inertia */`
4. Update export.ts to call new builders
5. Test with showcase tatemonos

### Backward Compatibility
- v8 + v9 are **additive**, not breaking
- Existing v7 tatemonos continue working
- Can choose framework per-tatemono

---

## Success Metrics for v8-v9

### v8 (Inertia.js)
- ✓ Can generate functional Inertia app from tatemono
- ✓ Form handling works (validation, submission)
- ✓ Real-time updates work
- ✓ No manual file editing required

### v9 (React Native)
- ✓ Can generate functional React Native app from tatemono
- ✓ API calls work (same endpoints as web)
- ✓ Auth works (Sanctum + secure storage)
- ✓ Real-time works (WebSocket subscriptions)
- ✓ Builds successfully (Expo or bare)

---

## Conclusion

**Arkzen v7 is already powerful.** v8 and v9 make it a complete ecosystem:
- One tatemono → Multiple frontend options
- Single backend → Any frontend framework
- Future-proof architecture → Easy to add more frameworks

**The vision**: Arkzen becomes the **universal full-stack scaffolder** — not locked to one tech stack, but a generator that speaks every language.
