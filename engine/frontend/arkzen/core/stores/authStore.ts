// ============================================================
// ARKZEN ENGINE — GLOBAL AUTH STORE v4.0 (COOKIE + PER-TATEMONO)
//
// CHANGES v4.0:
//   - Token now written to cookie on login/register so
//     middleware.ts can read it server-side for instant
//     redirects — no hydration flash.
//   - Cookie name: arkzen-auth-{slug}
//   - Cookie cleared on logout.
//
// CHANGES v3.0 (kept):
//   - Auth endpoints are now tatemono-scoped:
//       /api/{tatemono-slug}/auth/login
//       /api/{tatemono-slug}/auth/register
//       etc.
//   - Each tatemono has its own users table and token table —
//     there is no shared user pool.
//
// CHANGES v2.0 (kept):
//   - safeJson() handles non-JSON responses gracefully.
// ============================================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─────────────────────────────────────────────
// TATEMONO SLUG RESOLUTION
// Each tatemono's layout sets window.__ARKZEN_TATEMONO__ on mount.
// Auth endpoints are scoped per-tatemono:
//   /api/{slug}/auth/login
//   /api/{slug}/auth/register  etc.
// ─────────────────────────────────────────────

declare global {
  interface Window {
    __ARKZEN_TATEMONO__?: string
  }
}

function getSlug(): string {
  const s = typeof window !== 'undefined' ? window.__ARKZEN_TATEMONO__ : undefined
  if (!s) throw new Error('[Arkzen] window.__ARKZEN_TATEMONO__ is not set. Did you forget to call setActiveTatemono() in your tatemono?')
  return s
}

function getAuthBase(): string {
  return `/api/${getSlug()}/auth`
}

// ─────────────────────────────────────────────
// COOKIE HELPERS
// Writes/clears the per-tatemono auth cookie so middleware.ts
// can read it server-side before any page renders.
// Cookie name: arkzen-auth-{slug}
// ─────────────────────────────────────────────

function setCookie(slug: string, token: string): void {
  document.cookie = `arkzen-auth-${slug}=${token}; path=/; SameSite=Lax`
}

function clearCookie(slug: string): void {
  document.cookie = `arkzen-auth-${slug}=; path=/; max-age=0`
}

// ─────────────────────────────────────────────
// SAFE JSON HELPER
// Attempts to parse a Response as JSON.
// If the response is HTML (Laravel 404, 500, proxy error, etc.)
// this won't crash with "Unexpected token '<'" — it returns a
// friendly error object instead.
// ─────────────────────────────────────────────

async function safeJson<T = Record<string, unknown>>(res: Response): Promise<T> {
  const text = await res.text()
  try {
    return JSON.parse(text) as T
  } catch {
    // Response was HTML or empty — backend is likely down or mis-routed
    const status = res.status
    if (status === 0 || !res.url) {
      throw new Error('Cannot reach the server. Is the backend running?')
    }
    if (status >= 500) {
      throw new Error(`Server error (${status}). Check the Laravel logs.`)
    }
    if (status === 404) {
      throw new Error(`API route not found (${status}). Check your backend routes.`)
    }
    throw new Error(`Unexpected server response (${status}). Expected JSON but got HTML.`)
  }
}

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface ArkzenUser {
  id:         number
  name:       string
  email:      string
  role?:      string
  created_at: string
  updated_at: string
}

interface AuthState {
  user:            ArkzenUser | null
  token:           string | null
  isAuthenticated: boolean
  isLoading:       boolean

  login:    (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<void>
  logout:   () => Promise<void>
  fetchMe:  () => Promise<void>
  setToken: (token: string, user: ArkzenUser) => void
  clear:    () => void
}

// ─────────────────────────────────────────────
// STORE
// ─────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:            null,
      token:           null,
      isAuthenticated: false,
      isLoading:       false,

      // ── Login ────────────────────────────────
      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const res = await fetch(`${getAuthBase()}/login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ email, password }),
          })

          const data = await safeJson<{ user: ArkzenUser; token: string; message?: string }>(res)

          if (!res.ok) {
            throw new Error(data.message ?? 'Login failed. Check your credentials.')
          }

          set({ user: data.user, token: data.token, isAuthenticated: true })
          setCookie(getSlug(), data.token)
        } finally {
          set({ isLoading: false })
        }
      },

      // ── Register ─────────────────────────────
      register: async (name, email, password, passwordConfirmation) => {
        set({ isLoading: true })
        try {
          const res = await fetch(`${getAuthBase()}/register`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              name,
              email,
              password,
              password_confirmation: passwordConfirmation,
            }),
          })

          const data = await safeJson<{ user: ArkzenUser; token: string; message?: string }>(res)

          if (!res.ok) {
            throw new Error(data.message ?? 'Registration failed.')
          }

          set({ user: data.user, token: data.token, isAuthenticated: true })
          setCookie(getSlug(), data.token)
        } finally {
          set({ isLoading: false })
        }
      },

      // ── Logout ───────────────────────────────
      logout: async () => {
        const { token } = get()
        try {
          await fetch(`${getAuthBase()}/logout`, {
            method:  'POST',
            headers: {
              'Content-Type':  'application/json',
              'Authorization': `Bearer ${token}`,
            },
          })
          // safeJson not needed here — we don't care about the logout response body
        } catch {
          // Logout locally even if request fails
        } finally {
          set({ user: null, token: null, isAuthenticated: false })
          clearCookie(getSlug())
        }
      },

      // ── Fetch Current User ────────────────────
      fetchMe: async () => {
        const { token } = get()
        if (!token) { set({ isAuthenticated: false }); return }

        set({ isLoading: true })
        try {
          const res = await fetch(`${getAuthBase()}/me`, {
            headers: { 'Authorization': `Bearer ${token}` },
          })

          if (!res.ok) {
            set({ user: null, token: null, isAuthenticated: false })
            return
          }

          const user = await safeJson<ArkzenUser>(res)
          set({ user, isAuthenticated: true })
        } catch {
          // Backend unreachable — clear auth silently
          set({ user: null, token: null, isAuthenticated: false })
        } finally {
          set({ isLoading: false })
        }
      },

      // ── Manual setToken (for SSO / custom flows) ──
      setToken: (token, user) => {
        set({ token, user, isAuthenticated: true })
        setCookie(getSlug(), token)
      },

      // ── Clear (used internally by logout) ────
      clear: () => {
        set({ user: null, token: null, isAuthenticated: false })
        clearCookie(getSlug())
      },
    }),

    {
      name:       `arkzen-auth-${typeof window !== 'undefined' ? (window.__ARKZEN_TATEMONO__ ?? 'default') : 'default'}`,
      partialize: (state) => ({ token: state.token }),
    }
  )
)

// ─────────────────────────────────────────────
// FETCH HELPER
// Automatically attaches the Bearer token to any fetch call.
// Also uses safeJson internally so callers don't need to handle
// raw HTML error responses.
//
// Usage:
//   import { arkzenFetch } from '@/arkzen/core/stores/authStore'
//   const res = await arkzenFetch('/api/auth-test/inventories')
// ─────────────────────────────────────────────

export async function arkzenFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = useAuthStore.getState().token

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type':  'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
}

// Convenience: arkzenFetch + auto-parse JSON safely
export async function arkzenGet<T = unknown>(url: string): Promise<T> {
  const res = await arkzenFetch(url)
  return safeJson<T>(res)
}

// ─────────────────────────────────────────────
// TATEMONO LAYOUT HELPER
// Call this in your tatemono's root layout or page to register
// which tatemono is active. This scopes all auth calls to the
// correct isolated backend.
//
// Usage (in layout.tsx or the top of your page component):
//   import { setActiveTatemono } from '@/arkzen/core/stores/authStore'
//   setActiveTatemono('auth-test')
// ─────────────────────────────────────────────

export function setActiveTatemono(slug: string): void {
  if (typeof window !== 'undefined') {
    window.__ARKZEN_TATEMONO__ = slug
  }
}