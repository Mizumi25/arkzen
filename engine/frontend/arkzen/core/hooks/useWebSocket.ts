'use client'

// ============================================================
// ARKZEN ENGINE — useWebSocket
// arkzen/core/hooks/useWebSocket.ts
//
// Thin wrapper around Laravel Reverb / Echo.
// Manages connection lifecycle, channel subscriptions,
// and reconnection automatically.
//
// Architecture:
//   Reverb = transport layer  (moves data between clients)
//   CRDT   = data layer       (resolves conflicts per client)
//   These work together — useWebSocket handles transport,
//   useCRDT (below) handles conflict resolution.
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore }                              from '../stores/authStore'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type ChannelType = 'public' | 'private' | 'presence'

interface UseWebSocketOptions {
  channel:     string
  type?:       ChannelType
  events?:     Record<string, (data: unknown) => void>
  onConnect?:  () => void
  onDisconnect?: () => void
}

interface UseWebSocketResult {
  isConnected:  boolean
  isConnecting: boolean
  emit:         (event: string, data: unknown) => void
  disconnect:   () => void
}

// ─────────────────────────────────────────────
// REVERB CONFIG
// Read from env — set NEXT_PUBLIC_REVERB_* in .env
// ─────────────────────────────────────────────

const REVERB_HOST   = process.env.NEXT_PUBLIC_REVERB_HOST   ?? 'localhost'
const REVERB_PORT   = process.env.NEXT_PUBLIC_REVERB_PORT   ?? '8080'
const REVERB_SCHEME = process.env.NEXT_PUBLIC_REVERB_SCHEME ?? 'ws'
const APP_KEY       = process.env.NEXT_PUBLIC_REVERB_APP_KEY ?? 'arkzen'

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketResult {
  const { channel, type = 'public', events = {}, onConnect, onDisconnect } = options

  const { token }        = useAuthStore()
  const wsRef            = useRef<WebSocket | null>(null)
  const [isConnected,    setIsConnected]    = useState(false)
  const [isConnecting,   setIsConnecting]   = useState(true)
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef       = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // ─── Build Reverb WS URL ─────────────────────
  const buildUrl = useCallback((): string => {
    const base = `${REVERB_SCHEME}://${REVERB_HOST}:${REVERB_PORT}/app/${APP_KEY}`
    const params = new URLSearchParams({
      protocol: 'pusher',
      client:   'js',
      version:  '7.0',
    })
    if ((type === 'private' || type === 'presence') && token) {
      params.set('auth_key', token)
    }
    return `${base}?${params}`
  }, [type, token])

  // ─── Subscribe to channel ────────────────────
  const subscribe = useCallback((ws: WebSocket) => {
    const channelName = type === 'private'
      ? `private-${channel}`
      : type === 'presence'
        ? `presence-${channel}`
        : channel

    ws.send(JSON.stringify({
      event: 'pusher:subscribe',
      data:  { channel: channelName, auth: token ?? '' },
    }))
  }, [channel, type, token])

  // ─── Connect ─────────────────────────────────
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setIsConnecting(true)
    const ws = new WebSocket(buildUrl())
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) return
      setIsConnected(true)
      setIsConnecting(false)
      subscribe(ws)
      onConnect?.()
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as { event: string; data: unknown }
        const handler = events[msg.event]
        if (handler) handler(typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data)
      } catch { /* ignore malformed messages */ }
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      setIsConnected(false)
      setIsConnecting(false)
      onDisconnect?.()
      // Auto-reconnect after 3s
      reconnectTimeout.current = setTimeout(() => {
        if (mountedRef.current) connect()
      }, 3000)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [buildUrl, subscribe, events, onConnect, onDisconnect])

  useEffect(() => {
    connect()
    return () => {
      mountedRef.current = false
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current)
      wsRef.current?.close()
    }
  }, [channel, type])

  const emit = useCallback((event: string, data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event, data }))
    }
  }, [])

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current)
    wsRef.current?.close()
  }, [])

  return { isConnected, isConnecting, emit, disconnect }
}