// ============================================================
// ARKZEN ENGINE — CACHE
// arkzen/core/lib/cache.ts
//
// Zustand-based in-memory cache for API responses.
// Features:
//   - TTL (time-to-live) per entry
//   - Deduplication (one in-flight request per key)
//   - Manual invalidation
//   - Used internally by useQuery / useMutation
// ============================================================

import { create } from 'zustand'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface CacheEntry<T = unknown> {
  data:      T
  timestamp: number
  ttl:       number      // ms, 0 = forever
}

interface InFlight {
  promise: Promise<unknown>
}

interface CacheState {
  entries:   Record<string, CacheEntry>
  inFlight:  Record<string, InFlight>

  set:         (key: string, data: unknown, ttl?: number) => void
  get:         <T>(key: string) => T | null
  invalidate:  (key: string) => void
  invalidatePrefix: (prefix: string) => void
  clear:       () => void
  isStale:     (key: string) => boolean
  setInFlight: (key: string, promise: Promise<unknown>) => void
  getInFlight: (key: string) => Promise<unknown> | null
  clearInFlight: (key: string) => void
}

// ─────────────────────────────────────────────
// DEFAULT TTL — 5 minutes
// ─────────────────────────────────────────────

export const DEFAULT_TTL = 5 * 60 * 1000

// ─────────────────────────────────────────────
// CACHE STORE
// ─────────────────────────────────────────────

export const useCache = create<CacheState>((set, get) => ({
  entries:  {},
  inFlight: {},

  set: (key, data, ttl = DEFAULT_TTL) => {
    set(state => ({
      entries: {
        ...state.entries,
        [key]: { data, timestamp: Date.now(), ttl },
      },
    }))
  },

  get: <T>(key: string): T | null => {
    const entry = get().entries[key]
    if (!entry) return null
    if (entry.ttl > 0 && Date.now() - entry.timestamp > entry.ttl) {
      // Stale — remove and return null
      set(state => {
        const { [key]: _, ...rest } = state.entries
        return { entries: rest }
      })
      return null
    }
    return entry.data as T
  },

  isStale: (key) => {
    const entry = get().entries[key]
    if (!entry) return true
    if (entry.ttl === 0) return false
    return Date.now() - entry.timestamp > entry.ttl
  },

  invalidate: (key) => {
    set(state => {
      const { [key]: _, ...rest } = state.entries
      return { entries: rest }
    })
  },

  invalidatePrefix: (prefix) => {
    set(state => {
      const remaining = Object.fromEntries(
        Object.entries(state.entries).filter(([k]) => !k.startsWith(prefix))
      )
      return { entries: remaining }
    })
  },

  clear: () => set({ entries: {}, inFlight: {} }),

  setInFlight: (key, promise) => {
    set(state => ({
      inFlight: { ...state.inFlight, [key]: { promise } },
    }))
  },

  getInFlight: (key) => {
    return get().inFlight[key]?.promise ?? null
  },

  clearInFlight: (key) => {
    set(state => {
      const { [key]: _, ...rest } = state.inFlight
      return { inFlight: rest }
    })
  },
}))

// ─────────────────────────────────────────────
// CACHE KEY HELPERS
// ─────────────────────────────────────────────

export function cacheKey(url: string, params?: Record<string, unknown>): string {
  if (!params) return url
  const sorted = Object.keys(params).sort().reduce((acc, k) => {
    acc[k] = params[k]
    return acc
  }, {} as Record<string, unknown>)
  return `${url}?${JSON.stringify(sorted)}`
}