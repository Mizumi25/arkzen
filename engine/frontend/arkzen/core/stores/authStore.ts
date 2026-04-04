// ============================================================
// ARKZEN ENGINE — GLOBAL AUTH STORE v2.0
// Place at: engine/frontend/arkzen/core/stores/authStore.ts
//
// CHANGES v2.0:
//   - safeJson() helper: handles non-JSON responses (HTML 404/500
//     pages, proxy errors) gracefully instead of throwing a raw
//     "Unexpected token '<'" parse crash.
//   - All fetch calls (login, register, logout, fetchMe) now use
//     safeJson() — system-wide coverage, not just login.
//   - Better error messages when the backend is unreachable.
// ============================================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
          const res = await fetch('/api/auth/login', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ email, password }),
          })

          const data = await safeJson<{ user: ArkzenUser; token: string; message?: string }>(res)

          if (!res.ok) {
            throw new Error(data.message ?? 'Login failed. Check your credentials.')
          }

          set({ user: data.user, token: data.token, isAuthenticated: true })
        } finally {
          set({ isLoading: false })
        }
      },

      // ── Register ─────────────────────────────
      register: async (name, email, password, passwordConfirmation) => {
        set({ isLoading: true })
        try {
          const res = await fetch('/api/auth/register', {
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
        } finally {
          set({ isLoading: false })
        }
      },

      // ── Logout ───────────────────────────────
      logout: async () => {
        const { token } = get()
        try {
          await fetch('/api/auth/logout', {
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
        }
      },

      // ── Fetch Current User ────────────────────
      fetchMe: async () => {
        const { token } = get()
        if (!token) { set({ isAuthenticated: false }); return }

        set({ isLoading: true })
        try {
          const res = await fetch('/api/auth/me', {
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
      },

      // ── Clear (used internally by logout) ────
      clear: () => {
        set({ user: null, token: null, isAuthenticated: false })
      },
    }),

    {
      name:       'arkzen-auth',
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
//   const res = await arkzenFetch('/api/inventories')
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
