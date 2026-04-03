'use client'

// ============================================================
// ARKZEN ENGINE — useMutation
// arkzen/core/hooks/useMutation.ts
//
// Features:
//   - POST / PUT / PATCH / DELETE
//   - Optimistic updates (update UI before server confirms)
//   - Automatic cache invalidation on success
//   - onSuccess / onError callbacks
//   - Loading + error state
// ============================================================

import { useState, useCallback } from 'react'
import { useCache }              from '../lib/cache'
import { arkzenFetch }           from '../stores/authStore'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type HttpMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface UseMutationOptions<TData, TVariables> {
  method?:            HttpMethod
  invalidates?:       string[]    // cache key prefixes to invalidate on success
  onSuccess?:         (data: TData, variables: TVariables) => void
  onError?:           (error: string, variables: TVariables) => void
  onSettled?:         () => void
  optimisticUpdate?:  (variables: TVariables) => void  // run before request
  rollback?:          () => void                        // run if request fails
}

export interface UseMutationResult<TData, TVariables> {
  mutate:     (url: string, variables: TVariables) => Promise<TData | null>
  isLoading:  boolean
  isError:    boolean
  isSuccess:  boolean
  error:      string | null
  data:       TData | null
  reset:      () => void
}

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────

export function useMutation<TData = unknown, TVariables = unknown>(
  options: UseMutationOptions<TData, TVariables> = {}
): UseMutationResult<TData, TVariables> {
  const {
    method           = 'POST',
    invalidates      = [],
    onSuccess,
    onError,
    onSettled,
    optimisticUpdate,
    rollback,
  } = options

  const cache = useCache()

  const [isLoading, setIsLoading] = useState(false)
  const [isError,   setIsError]   = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [data,      setData]      = useState<TData | null>(null)

  const mutate = useCallback(async (url: string, variables: TVariables): Promise<TData | null> => {
    setIsLoading(true)
    setIsError(false)
    setIsSuccess(false)
    setError(null)

    // Optimistic update before request
    if (optimisticUpdate) {
      try { optimisticUpdate(variables) } catch { /* ignore */ }
    }

    try {
      const body = variables instanceof FormData
        ? variables
        : JSON.stringify(variables)

      const headers: HeadersInit = variables instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }

      const res = await arkzenFetch(url, {
        method,
        headers,
        body: method === 'DELETE' ? undefined : body,
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ message: res.statusText }))
        throw new Error(errBody.message ?? `HTTP ${res.status}`)
      }

      const result: TData = method === 'DELETE'
        ? ({ message: 'Deleted successfully' } as TData)
        : await res.json()

      setData(result)
      setIsSuccess(true)

      // Invalidate caches
      for (const prefix of invalidates) {
        cache.invalidatePrefix(prefix)
      }

      onSuccess?.(result, variables)
      return result

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setIsError(true)
      setError(msg)

      // Rollback optimistic update
      if (rollback) {
        try { rollback() } catch { /* ignore */ }
      }

      onError?.(msg, variables)
      return null

    } finally {
      setIsLoading(false)
      onSettled?.()
    }
  }, [method, invalidates, optimisticUpdate, rollback, onSuccess, onError, onSettled])

  const reset = useCallback(() => {
    setIsLoading(false)
    setIsError(false)
    setIsSuccess(false)
    setError(null)
    setData(null)
  }, [])

  return { mutate, isLoading, isError, isSuccess, error, data, reset }
}