/* @arkzen:meta
name: broadcast-test
version: 2.0.0
description: Tests all three Laravel Reverb channel types end-to-end. Public channel (no auth), private channel (user-scoped), and presence channel (member roster). Each panel is independently testable.
auth: true
*/

/* @arkzen:config
toast:
  position: top-right
  duration: 3000
layout:
  guest:
    className: "min-h-screen bg-neutral-50"
  auth:
    className: "min-h-screen bg-neutral-50"
*/

/* @arkzen:database:messages
table: messages
timestamps: true
softDeletes: false
columns:
  id:
    type: integer
    primary: true
    autoIncrement: true
  content:
    type: string
    length: 500
    nullable: false
  channel_type:
    type: string
    length: 50
    nullable: true
*/

/* @arkzen:api:messages
model: Message
controller: MessageController
prefix: /api/broadcast-test/messages
middleware: []
endpoints:
  index:
    method: GET
    route: /
    description: Get recent messages
    response:
      type: paginated
  store:
    method: POST
    route: /
    description: Send a message and broadcast it on the selected channel type
    type: broadcast
    validation:
      content: required|string|max:500
      channel_type: sometimes|string|max:50
    response:
      type: single
  destroy:
    method: DELETE
    route: /{id}
    description: Delete a message
    response:
      type: message
      value: Message deleted
*/

/* @arkzen:realtime:broadcast-test-public
type: public
*/
/* @arkzen:realtime:broadcast-test-public:end */

/* @arkzen:realtime:message-sent-public
channel: broadcast-test-public
type: public
*/
/* @arkzen:realtime:message-sent-public:end */

/* @arkzen:realtime:broadcast-test.{id}
type: private
*/
/* @arkzen:realtime:broadcast-test.{id}:end */

/* @arkzen:realtime:message-sent-private
channel: broadcast-test.{id}
type: private
*/
/* @arkzen:realtime:message-sent-private:end */

/* @arkzen:realtime:broadcast-test-presence
type: presence
*/
/* @arkzen:realtime:broadcast-test-presence:end */

/* @arkzen:realtime:message-sent-presence
channel: broadcast-test-presence
type: presence
*/
/* @arkzen:realtime:message-sent-presence:end */

/* @arkzen:components:shared */

'use client'

import React, { useState, useEffect, useRef, useCallback, memo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, setActiveTatemono, arkzenFetch } from '@/arkzen/core/stores/authStore'

if (typeof window !== 'undefined') {
  setActiveTatemono('broadcast-test')
}

const REVERB_HOST   = process.env.NEXT_PUBLIC_REVERB_HOST    ?? 'localhost'
const REVERB_PORT   = process.env.NEXT_PUBLIC_REVERB_PORT    ?? '8080'
const REVERB_SCHEME = process.env.NEXT_PUBLIC_REVERB_SCHEME  ?? 'ws'
const APP_KEY       = process.env.NEXT_PUBLIC_REVERB_APP_KEY ?? 'arkzen-key'

// ── ChannelPanel — top-level memo so it never remounts on parent re-render.
// Defined outside DashboardPage to preserve input focus on mobile (Android keyboard
// dismisses when a component is unmounted/remounted, which happens if Panel is an
// inline const inside a parent that re-renders on every keystroke).
type WsStatus = 'connecting' | 'connected' | 'error'

interface Message {
  id:           number
  content:      string
  channel_type: string | null
  created_at:   string
}

const dot = (s: WsStatus) => ({
  connecting: 'bg-yellow-400',
  connected:  'bg-green-400',
  error:      'bg-red-400',
}[s])

const ChannelPanel = memo(({
  title, badge, badgeColor, description, status, count, msgs, onSend, footer,
}: {
  title: string; badge: string; badgeColor: string; description: string
  status: WsStatus; count: number; msgs: Message[]
  onSend: (value: string) => void
  footer?: React.ReactNode
}) => {
  // Uncontrolled input with ref — keystrokes never bubble up to parent state,
  // so the parent doesn't re-render and the mobile keyboard stays open.
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    const val = inputRef.current?.value?.trim()
    if (!val) return
    onSend(val)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full text-white ${badgeColor}`}>{badge}</span>
            <h2 className="font-semibold text-sm">{title}</h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <div className={`w-1.5 h-1.5 rounded-full ${dot(status)}`} />
            <span>{status}</span>
            <span className="text-neutral-300">·</span>
            <span>{count} received</span>
          </div>
        </div>
        <p className="text-xs text-neutral-400 mt-1">{description}</p>
      </div>

      <div className="px-5 py-3 border-b border-neutral-50 flex gap-2">
        <input
          ref={inputRef}
          className="arkzen-input flex-1 text-sm"
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type and press Enter..."
        />
        <button className="arkzen-btn text-sm" onClick={handleSend}>Send</button>
      </div>

      {footer && <div className="px-5 py-2 border-b border-neutral-50">{footer}</div>}

      <div className="max-h-48 overflow-y-auto">
        {msgs.length === 0 ? (
          <div className="p-6 text-center text-xs text-neutral-300">No messages yet</div>
        ) : (
          <div className="divide-y divide-neutral-50">
            {msgs.map((m, i) => (
              <div key={i} className="px-5 py-2.5 flex items-start gap-2">
                <p className="text-sm text-neutral-700 flex-1">{m.content}</p>
                <span className="text-xs text-neutral-300 shrink-0">{m.created_at?.slice(11, 19)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})
ChannelPanel.displayName = 'ChannelPanel'

/* @arkzen:components:shared:end */
/* @arkzen:page:login */
/* @arkzen:page:layout:guest */
const LoginPage = () => {
  const { login, isLoading } = useAuthStore()
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState<string | null>(null)

  const handleLogin = async () => {
    setError(null)
    try { await login(email, password) }
    catch (e) { setError(e instanceof Error ? e.message : 'Login failed') }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-8 w-full max-w-sm space-y-5">
        <div>
          <h1 className="text-xl font-bold">📡 Broadcast Test</h1>
          <p className="text-sm text-neutral-500 mt-1">Sign in to test all channel types</p>
        </div>
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">{error}</div>
        )}
        <div className="space-y-3">
          <input className="arkzen-input w-full" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input className="arkzen-input w-full" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>
        <button className="arkzen-btn w-full" onClick={handleLogin} disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
        <p className="text-xs text-center text-neutral-400">
          No account?{' '}
          <a href="/broadcast-test/register" className="text-neutral-700 underline underline-offset-2">Register</a>
        </p>
      </div>
    </div>
  )
}
/* @arkzen:page:login:end */

/* @arkzen:page:register */
/* @arkzen:page:layout:guest */
const RegisterPage = () => {
  const { register, isLoading } = useAuthStore()
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError]     = useState<string | null>(null)

  const handleRegister = async () => {
    setError(null)
    if (password !== confirm) { setError('Passwords do not match'); return }
    try { await register(name, email, password, confirm) }
    catch (e) { setError(e instanceof Error ? e.message : 'Registration failed') }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-8 w-full max-w-sm space-y-5">
        <div>
          <h1 className="text-xl font-bold">📡 Broadcast Test</h1>
          <p className="text-sm text-neutral-500 mt-1">Create an account to test private + presence channels</p>
        </div>
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">{error}</div>
        )}
        <div className="space-y-3">
          <input className="arkzen-input w-full" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
          <input className="arkzen-input w-full" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input className="arkzen-input w-full" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          <input className="arkzen-input w-full" type="password" placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} />
        </div>
        <button className="arkzen-btn w-full" onClick={handleRegister} disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Create account'}
        </button>
        <p className="text-xs text-center text-neutral-400">
          Already have an account?{' '}
          <a href="/broadcast-test/login" className="text-neutral-700 underline underline-offset-2">Sign in</a>
        </p>
      </div>
    </div>
  )
}
/* @arkzen:page:register:end */

/* @arkzen:page:dashboard */
/* @arkzen:page:layout:auth */
const DashboardPage = () => {
  const router = useRouter()
  const { user, logout } = useAuthStore()

  // ── per-channel state ──────────────────────────────────────
  const [publicMsgs,   setPublicMsgs]   = useState<Message[]>([])
  const [privateMsgs,  setPrivateMsgs]  = useState<Message[]>([])
  const [presenceMsgs, setPresenceMsgs] = useState<Message[]>([])
  const [members,      setMembers]      = useState<{id:number;name:string}[]>([])

  const [publicStatus,   setPublicStatus]   = useState<WsStatus>('connecting')
  const [privateStatus,  setPrivateStatus]  = useState<WsStatus>('connecting')
  const [presenceStatus, setPresenceStatus] = useState<WsStatus>('connecting')

  // Input state removed — ChannelPanel uses uncontrolled refs to prevent
  // keyboard dismiss on Android when parent re-renders on keystroke.

  const [publicCount,   setPublicCount]   = useState(0)
  const [privateCount,  setPrivateCount]  = useState(0)
  const [presenceCount, setPresenceCount] = useState(0)

  // one shared raw WS — all three channels multiplexed over a single Reverb connection
  const wsRef            = useRef<WebSocket | null>(null)
  const mountedRef       = useRef(true)
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── helpers ───────────────────────────────────────────────
  const addMsg = (setter: React.Dispatch<React.SetStateAction<Message[]>>, msg: Message) =>
    setter(prev => [msg, ...prev].slice(0, 50))

  const send = async (channelType: string, content: string, clearFn: () => void) => {
    if (!content.trim()) return
    try {
      await arkzenFetch('/api/broadcast-test/messages', {
        method: 'POST',
        body:   JSON.stringify({ content, channel_type: channelType }),
      })
      clearFn()
    } catch (e) { console.error(e) }
  }

  // ── WebSocket — single connection, three subscriptions ────
  const connectReverb = async (userId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setPublicStatus('connecting')
    setPrivateStatus('connecting')
    setPresenceStatus('connecting')

    const ws = new WebSocket(`${REVERB_SCHEME}://${REVERB_HOST}:${REVERB_PORT}/app/${APP_KEY}`)
    wsRef.current = ws

    ws.onopen = () => { /* wait for connection_established */ }

    ws.onmessage = async (event) => {
      if (!mountedRef.current) return
      let msg: { event: string; data: unknown; channel?: string }
      try { msg = JSON.parse(event.data) } catch { return }

      // ── connection established → subscribe to all three channels ──
      if (msg.event === 'pusher:connection_established') {
        const connData  = typeof msg.data === 'string' ? JSON.parse(msg.data as string) : msg.data
        const socketId  = (connData as any).socket_id as string

        // 1. public — no auth needed
        setPublicStatus('connected')
        ws.send(JSON.stringify({
          event: 'pusher:subscribe',
          data:  { channel: 'broadcast-test-public' },
        }))

        // 2. private — needs HMAC auth
        try {
          const privateAuth = await arkzenFetch('/api/broadcast-test/auth/broadcasting/auth', {
            method: 'POST',
            body:   JSON.stringify({ socket_id: socketId, channel_name: `private-broadcast-test.${userId}` }),
          })
          if (privateAuth.ok) {
            const { auth } = await privateAuth.json()
            ws.send(JSON.stringify({
              event: 'pusher:subscribe',
              data:  { channel: `private-broadcast-test.${userId}`, auth },
            }))
            setPrivateStatus('connected')
          } else {
            setPrivateStatus('error')
          }
        } catch { setPrivateStatus('error') }

        // 3. presence — needs HMAC auth (same endpoint, different channel name)
        // The backend signs socketId:channelName:channelData and returns both
        // auth + channel_data. We must use the server's channel_data in the
        // subscribe message so Reverb can verify the signature matches.
        try {
          const presenceAuth = await arkzenFetch('/api/broadcast-test/auth/broadcasting/auth', {
            method: 'POST',
            body:   JSON.stringify({
              socket_id:    socketId,
              channel_name: 'presence-broadcast-test-presence',
            }),
          })
          if (presenceAuth.ok) {
            const { auth, channel_data } = await presenceAuth.json()
            ws.send(JSON.stringify({
              event: 'pusher:subscribe',
              data:  {
                channel:      'presence-broadcast-test-presence',
                auth,
                channel_data, // use server-issued channel_data — must match what was signed
              },
            }))
            setPresenceStatus('connected')
          } else {
            setPresenceStatus('error')
          }
        } catch { setPresenceStatus('error') }
      }

      // ── debug — log every message ─────────────────────────
      console.log('[Reverb RX]', msg.event, msg.channel, msg.data)

      // ── public message ──────────────────────────────────────
      if (msg.event === 'broadcast-test.message-sent-public' || msg.channel === 'broadcast-test-public') {
        const payload = typeof msg.data === 'string' ? JSON.parse(msg.data as string) : msg.data
        addMsg(setPublicMsgs, payload as Message)
        setPublicCount(c => c + 1)
      }

      // ── private message ─────────────────────────────────────
      if (msg.event === 'broadcast-test.message-sent-private') {
        const payload = typeof msg.data === 'string' ? JSON.parse(msg.data as string) : msg.data
        addMsg(setPrivateMsgs, payload as Message)
        setPrivateCount(c => c + 1)
      }

      // ── presence message ────────────────────────────────────
      if (msg.event === 'broadcast-test.message-sent-presence') {
        const payload = typeof msg.data === 'string' ? JSON.parse(msg.data as string) : msg.data
        addMsg(setPresenceMsgs, payload as Message)
        setPresenceCount(c => c + 1)
      }

      // ── presence member joined ──────────────────────────────
      if (msg.event === 'pusher_internal:member_added') {
        const d = typeof msg.data === 'string' ? JSON.parse(msg.data as string) : msg.data
        setMembers(prev => [...prev.filter(m => m.id !== (d as any).user_id), { id: (d as any).user_id, name: (d as any).user_info?.name ?? 'Unknown' }])
      }

      // ── presence member left ────────────────────────────────
      if (msg.event === 'pusher_internal:member_removed') {
        const d = typeof msg.data === 'string' ? JSON.parse(msg.data as string) : msg.data
        setMembers(prev => prev.filter(m => m.id !== (d as any).user_id))
      }

      // ── presence subscription succeeded (initial member list) ──
      if (msg.event === 'pusher_internal:subscription_succeeded' && msg.channel === 'presence-broadcast-test-presence') {
        const d = typeof msg.data === 'string' ? JSON.parse(msg.data as string) : msg.data
        const hash = (d as any).presence?.hash ?? {}
        setMembers(Object.entries(hash).map(([id, info]: [string, any]) => ({ id: Number(id), name: info?.name ?? 'Unknown' })))
      }
    }

    ws.onerror = () => ws.close()

    ws.onclose = () => {
      if (!mountedRef.current) return
      setPublicStatus('error')
      setPrivateStatus('error')
      setPresenceStatus('error')
      reconnectTimeout.current = setTimeout(() => {
        if (mountedRef.current) connectReverb(userId)
      }, 3000)
    }
  }

  useEffect(() => {
    mountedRef.current = true
    if (user?.id) {
      const t = setTimeout(() => { if (mountedRef.current) connectReverb(user.id) }, 50)
      return () => clearTimeout(t)
    }
    return () => {
      mountedRef.current = false
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current)
      wsRef.current?.close()
    }
  }, [user?.id])

  const handleLogout = async () => {
    wsRef.current?.close()
    await logout()
    router.refresh()
    router.replace('/broadcast-test/login')
  }

  // ── useCallback send handlers — stable references, won't cause ChannelPanel to re-render
  const sendPublic   = useCallback((val: string) => send('public',   val, () => {}), [user?.id])
  const sendPrivate  = useCallback((val: string) => send('private',  val, () => {}), [user?.id])
  const sendPresence = useCallback((val: string) => send('presence', val, () => {}), [user?.id])

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">📡 Broadcast Test</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Signed in as <span className="font-medium">{user?.name}</span>
            </p>
          </div>
          <button className="text-xs text-neutral-400 hover:text-neutral-700" onClick={handleLogout}>
            Sign out
          </button>
        </div>

        {/* ── Public channel ───────────────────────────────── */}
        <ChannelPanel
          title="Public channel"
          badge="public"
          badgeColor="bg-blue-500"
          description="broadcast-test-public · No auth required. All visitors receive these messages."
          status={publicStatus}
          count={publicCount}
          msgs={publicMsgs}
          onSend={sendPublic}
        />

        {/* ── Private channel ──────────────────────────────── */}
        <ChannelPanel
          title="Private channel"
          badge="private"
          badgeColor="bg-purple-500"
          description={`private-broadcast-test.${user?.id} · Only you receive these — HMAC-signed per user.`}
          status={privateStatus}
          count={privateCount}
          msgs={privateMsgs}
          onSend={sendPrivate}
        />

        {/* ── Presence channel ─────────────────────────────── */}
        <ChannelPanel
          title="Presence channel"
          badge="presence"
          badgeColor="bg-green-500"
          description="presence-broadcast-test-presence · Auth + member roster. Open two tabs to see both members."
          status={presenceStatus}
          count={presenceCount}
          msgs={presenceMsgs}
          onSend={sendPresence}
          footer={
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-neutral-400">Online:</span>
              {members.length === 0
                ? <span className="text-xs text-neutral-300">No members yet</span>
                : members.map(m => (
                    <span key={m.id} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100">
                      {m.name}
                    </span>
                  ))
              }
            </div>
          }
        />

        <div className="text-xs text-neutral-400 bg-neutral-50 rounded-xl p-4 space-y-1">
          <p><strong>How each type works:</strong></p>
          <p>🔵 <strong>Public</strong> — open channel, any WebSocket client subscribes freely, no auth handshake.</p>
          <p>🟣 <strong>Private</strong> — channel name is scoped to your user ID. Reverb verifies ownership via HMAC before subscribing.</p>
          <p>🟢 <strong>Presence</strong> — like private but Reverb also tracks a live member roster, firing member_added / member_removed events.</p>
          <p className="pt-1 text-neutral-300">Run <code>php artisan reverb:start</code> + <code>php artisan queue:work</code> for full functionality.</p>
        </div>

      </div>
    </div>
  )
}
/* @arkzen:page:dashboard:end */