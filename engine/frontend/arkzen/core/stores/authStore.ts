// ============================================================
// ARKZEN ENGINE — GLOBAL AUTH STORE
// Place at: engine/frontend/arkzen/core/stores/authStore.ts
//
// Replaces the fake localStorage token check in BaseLayout.
// Uses Zustand for real reactive auth state.
//
// What it does:
//   - Stores the current user + Sanctum token
//   - Provides login(), logout(), fetchMe() actions
//   - Persists token to localStorage (only the token, not user)
//   - BaseLayout reads isAuthenticated from this store
// ============================================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

  // Actions
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

          if (!res.ok) {
            const err = await res.json()
            throw new Error(err.message ?? 'Login failed')
          }

          const data: { user: ArkzenUser; token: string } = await res.json()
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

          if (!res.ok) {
            const err = await res.json()
            throw new Error(err.message ?? 'Registration failed')
          }

          const data: { user: ArkzenUser; token: string } = await res.json()
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

          const user: ArkzenUser = await res.json()
          set({ user, isAuthenticated: true })
        } catch {
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
      name:    'arkzen-auth',   // localStorage key
      partialize: (state) => ({ token: state.token }),  // only persist token
    }
  )
)

// ─────────────────────────────────────────────
// FETCH HELPER
// Automatically attaches the Bearer token to any fetch call.
// Use this instead of raw fetch in tatemono page sections.
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