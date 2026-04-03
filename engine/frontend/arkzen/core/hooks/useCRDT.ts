'use client'

// ============================================================
// ARKZEN ENGINE — useCRDT
// arkzen/core/hooks/useCRDT.ts
//
// CRDT = Conflict-free Replicated Data Type
// Handles conflict resolution when multiple clients edit
// the same data simultaneously via Reverb.
//
// Uses Last-Write-Wins (LWW) with Lamport timestamps.
// Each field has its own timestamp — whoever wrote it last wins.
//
// Works WITH useWebSocket:
//   useWebSocket = Reverb transport (delivers changes)
//   useCRDT      = merges incoming changes without conflicts
//
// Usage:
//   const { state, update, merge } = useCRDT({ id: 'doc-1', initial: myData })
//   update('title', 'New Title')              // local update
//   merge(incomingChange)                      // from Reverb event
// ============================================================

import { useState, useCallback, useRef } from 'react'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

// LWW Register — each field has value + timestamp
type LWWField<T> = {
  value:     T
  timestamp: number  // Lamport clock
  clientId:  string
}

type CRDTDocument<T extends Record<string, unknown>> = {
  [K in keyof T]: LWWField<T[K]>
}

interface CRDTChange<T extends Record<string, unknown>> {
  field:     keyof T
  value:     T[keyof T]
  timestamp: number
  clientId:  string
}

interface UseCRDTOptions<T extends Record<string, unknown>> {
  id:       string   // document identifier
  initial:  T        // initial state
}

interface UseCRDTResult<T extends Record<string, unknown>> {
  state:     T                                      // current merged state (plain object)
  update:    (field: keyof T, value: T[keyof T]) => CRDTChange<T>  // local update, returns change to broadcast
  merge:     (change: CRDTChange<T>) => void        // apply incoming remote change
  mergeMany: (changes: CRDTChange<T>[]) => void     // apply multiple changes at once
  clock:     number                                 // current Lamport clock
}

// ─────────────────────────────────────────────
// CLIENT ID — stable per browser session
// ─────────────────────────────────────────────

const CLIENT_ID = (() => {
  if (typeof window === 'undefined') return 'server'
  const stored = sessionStorage.getItem('arkzen_crdt_client_id')
  if (stored) return stored
  const id = `client_${Math.random().toString(36).slice(2, 9)}`
  sessionStorage.setItem('arkzen_crdt_client_id', id)
  return id
})()

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────

export function useCRDT<T extends Record<string, unknown>>(
  options: UseCRDTOptions<T>
): UseCRDTResult<T> {
  const { initial } = options

  // Initialize LWW document — each field starts at timestamp 0
  const initDoc = (): CRDTDocument<T> => {
    const doc = {} as CRDTDocument<T>
    for (const key in initial) {
      doc[key] = { value: initial[key], timestamp: 0, clientId: CLIENT_ID }
    }
    return doc
  }

  const docRef   = useRef<CRDTDocument<T>>(initDoc())
  const clockRef = useRef<number>(0)

  // Plain state derived from LWW document
  const extractState = (doc: CRDTDocument<T>): T => {
    const state = {} as T
    for (const key in doc) {
      state[key] = doc[key].value
    }
    return state
  }

  const [state, setState] = useState<T>(() => extractState(docRef.current))

  // ─── Lamport Clock Tick ──────────────────────
  const tick = useCallback((): number => {
    clockRef.current = clockRef.current + 1
    return clockRef.current
  }, [])

  // ─── LOCAL UPDATE ────────────────────────────
  // Applies change locally and returns a CRDTChange to broadcast via Reverb
  const update = useCallback((field: keyof T, value: T[keyof T]): CRDTChange<T> => {
    const timestamp = tick()
    const change: CRDTChange<T> = { field, value, timestamp, clientId: CLIENT_ID }

    docRef.current[field] = { value, timestamp, clientId: CLIENT_ID }
    setState(extractState(docRef.current))

    return change
  }, [tick])

  // ─── MERGE INCOMING CHANGE ───────────────────
  // LWW: apply only if incoming timestamp > current timestamp for that field
  const merge = useCallback((change: CRDTChange<T>) => {
    const { field, value, timestamp, clientId } = change
    const current = docRef.current[field]

    // Update Lamport clock to max(local, remote) + 1
    clockRef.current = Math.max(clockRef.current, timestamp) + 1

    if (!current || timestamp > current.timestamp) {
      // Remote wins — newer timestamp
      docRef.current[field] = { value, timestamp, clientId }
      setState(extractState(docRef.current))
    } else if (timestamp === current.timestamp && clientId < current.clientId) {
      // Tie-break by client ID (lexicographic) — deterministic
      docRef.current[field] = { value, timestamp, clientId }
      setState(extractState(docRef.current))
    }
    // else: local is newer — ignore incoming
  }, [])

  const mergeMany = useCallback((changes: CRDTChange<T>[]) => {
    for (const change of changes) merge(change)
  }, [merge])

  return {
    state,
    update,
    merge,
    mergeMany,
    clock: clockRef.current,
  }
}