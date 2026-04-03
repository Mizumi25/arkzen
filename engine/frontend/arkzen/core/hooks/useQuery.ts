'use client'

// ============================================================
// ARKZEN ENGINE — useQuery
// arkzen/core/hooks/useQuery.ts
//
// Features:
//   - Caching with TTL (via cache.ts)
//   - Deduplication (same URL only fetches once at a time)
//   - Retry logic (3 attempts with exponential backoff)
//   - Optimistic reads from cache while refetching
//   - Background refetch on window focus
//   - Manual refetch
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { useCache, cacheKey, DEFAULT_TTL }           from '../lib/cache'
import { arkzenFetch }                               from '../stores/authStore'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface UseQueryOptions {
  ttl?:              number     // cache TTL in ms (default: 5min)
  enabled?:          boolean    // false = don't fetch yet
  retry?:            number     // retry attempts (default: 3)
  retryDelay?:       number     // base delay ms (default: 1000, doubles each attempt)
  refetchOnFocus?:   boolean    // refetch when window regains focus (default: true)
  params?:           Record<string, unknown>  // appended to URL as query string
}

export interface UseQueryResult<T> {
  data:      T | null
  isLoading: boolean
  isFetching: boolean   // true even when cached data exists but background fetch running
  isError:   boolean
  error:     string | null
  refetch:   () => Promise<void>
}

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────

export function useQuery<T = unknown>(
  url: string,
  options: UseQueryOptions = {}
): UseQueryResult<T> {
  const {
    ttl            = DEFAULT_TTL,
    enabled        = true,
    retry          = 3,
    retryDelay     = 1000,
    refetchOnFocus = true,
    params,
  } = options

  const cache      = useCache()
  const key        = cacheKey(url, params)
  const fullUrl    = params ? buildUrl(url, params) : url

  const [data,       setData]       = useState<T | null>(() => cache.get<T>(key))
  const [isLoading,  setIsLoading]  = useState<boolean>(!cache.get<T>(key) && enabled)
  const [isFetching, setIsFetching] = useState<boolean>(false)
  const [isError,    setIsError]    = useState<boolean>(false)
  const [error,      setError]      = useState<string | null>(null)

  const mountedRef = useRef(true)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  // ─────────────────────────────────────────────
  // FETCH WITH RETRY + DEDUP
  // ─────────────────────────────────────────────

  const fetchData = useCallback(async (isBackground = false) => {
    if (!enabled) return

    // Deduplication — if already in-flight, wait for it
    const existing = cache.getInFlight(key)
    if (existing) {
      try { await existing } catch { /* handled below */ }
      const cached = cache.get<T>(key)
      if (cached && mountedRef.current) setData(cached)
      return
    }

    if (!isBackground) setIsLoading(true)
    setIsFetching(true)
    setIsError(false)
    setError(null)

    let attempt = 0

    const attempt_fetch: () => Promise<void> = async () => {
      try {
        const res = await arkzenFetch(fullUrl)
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)

        const json: T = await res.json()

        cache.set(key, json, ttl)
        if (mountedRef.current) {
          setData(json)
          setIsError(false)
          setError(null)
        }
      } catch (err) {
        attempt++
        if (attempt < retry) {
          // Exponential backoff
          await sleep(retryDelay * Math.pow(2, attempt - 1))
          return attempt_fetch()
        }
        const msg = err instanceof Error ? err.message : 'Unknown error'
        if (mountedRef.current) {
          setIsError(true)
          setError(msg)
        }
      }
    }

    const promise = attempt_fetch()
    cache.setInFlight(key, promise)

    try {
      await promise
    } finally {
      cache.clearInFlight(key)
      if (mountedRef.current) {
        setIsLoading(false)
        setIsFetching(false)
      }
    }
  }, [url, key, fullUrl, enabled, retry, retryDelay, ttl])

  // ─────────────────────────────────────────────
  // INITIAL FETCH
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (!enabled) return
    const cached = cache.get<T>(key)
    if (cached) {
      setData(cached)
      setIsLoading(false)
      // Stale-while-revalidate: serve cache, refetch in background
      if (cache.isStale(key)) fetchData(true)
    } else {
      fetchData(false)
    }
  }, [key, enabled])

  // ─────────────────────────────────────────────
  // REFETCH ON WINDOW FOCUS
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (!refetchOnFocus || !enabled) return
    const handler = () => { if (cache.isStale(key)) fetchData(true) }
    window.addEventListener('focus', handler)
    return () => window.removeEventListener('focus', handler)
  }, [key, enabled, refetchOnFocus])

  return {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch: () => fetchData(false),
  }
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function buildUrl(url: string, params: Record<string, unknown>): string {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [k, String(v)])
  ).toString()
  return qs ? `${url}?${qs}` : url
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}