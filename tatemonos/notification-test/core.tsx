/* @arkzen:meta
name: notification-test
version: 2.1.0
description: Tests Laravel Notifications across all three channels — database (bell), mail, and broadcast (real-time popup). Uses Laravel's native notifications table.
auth: true
*/

/* @arkzen:config
toast:
  position: top-right
  duration: 5000
layout:
  guest:
    className: "min-h-screen bg-neutral-50"
  auth:
    className: "min-h-screen bg-neutral-50"
*/

/* @arkzen:api:notifications
model: Notification
controller: NotificationController
prefix: /api/notification-test
middleware: [auth]
endpoints:
  index:
    method: GET
    route: /inbox
    description: Get all notifications for the authenticated user
    response:
      type: collection
  store:
    method: POST
    route: /trigger
    description: Trigger a notification
    type: notification_trigger
    validation:
      notification: required|string
    response:
      type: single
  destroy:
    method: DELETE
    route: /inbox/{id}
    description: Delete a notification
    response:
      type: message
      value: Notification deleted
  readAll:
    method: POST
    route: /inbox/read-all
    description: Mark all notifications as read
    response:
      type: message
      value: All notifications marked as read
*/

/* @arkzen:notifications:database-ping
channels: [database]
message: "You have a new database notification"
subject: "Database Ping"
*/
/* @arkzen:notifications:database-ping:end */

/* @arkzen:notifications:mail-ping
channels: [mail]
message: "This is a test mail notification"
subject: "Mail Ping from Arkzen"
*/
/* @arkzen:notifications:mail-ping:end */

/* @arkzen:notifications:broadcast-ping
channels: [broadcast, database]
message: "Real-time notification received!"
subject: "Broadcast Ping"
*/
/* @arkzen:notifications:broadcast-ping:end */

/* @arkzen:notifications:all-channels
channels: [database, mail, broadcast]
message: "This notification was sent to all three channels simultaneously"
subject: "All Channels Test"
*/
/* @arkzen:notifications:all-channels:end */

/* @arkzen:components:shared */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, setActiveTatemono, arkzenFetch } from '@/arkzen/core/stores/authStore'

if (typeof window !== 'undefined') {
  setActiveTatemono('notification-test')
}

// ─────────────────────────────────────────────
// REVERB CONFIG — read from env, same as useWebSocket.ts
// ─────────────────────────────────────────────
const REVERB_HOST   = process.env.NEXT_PUBLIC_REVERB_HOST    ?? 'localhost'
const REVERB_PORT   = process.env.NEXT_PUBLIC_REVERB_PORT    ?? '8080'
const REVERB_SCHEME = process.env.NEXT_PUBLIC_REVERB_SCHEME  ?? 'ws'
const APP_KEY       = process.env.NEXT_PUBLIC_REVERB_APP_KEY ?? 'arkzen-key'

/* @arkzen:components:shared:end */

/* @arkzen:page:login */
/* @arkzen:page:layout:guest */
const LoginPage = () => {
  const { login, isLoading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    setError(null)
    try {
      await login(email, password)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-8 w-full max-w-sm space-y-5">
        <div>
          <h1 className="text-xl font-bold">🔔 Notification Test</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Sign in to test notifications
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <input
            className="arkzen-input w-full"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <input
            className="arkzen-input w-full"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        <button className="arkzen-btn w-full" onClick={handleLogin} disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>

        <p className="text-xs text-center text-neutral-400">
          No account?{' '}
          <a href="/notification-test/register" className="text-neutral-700 underline underline-offset-2">
            Register
          </a>
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
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleRegister = async () => {
    setError(null)
    if (password !== confirm) { setError('Passwords do not match'); return }
    try {
      await register(name, email, password, confirm)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-8 w-full max-w-sm space-y-5">
        <div>
          <h1 className="text-xl font-bold">🔔 Notification Test</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Create an account to test notifications
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <input
            className="arkzen-input w-full"
            placeholder="Name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <input
            className="arkzen-input w-full"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <input
            className="arkzen-input w-full"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <input
            className="arkzen-input w-full"
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
          />
        </div>

        <button className="arkzen-btn w-full" onClick={handleRegister} disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Create account'}
        </button>

        <p className="text-xs text-center text-neutral-400">
          Already have an account?{' '}
          <a href="/notification-test/login" className="text-neutral-700 underline underline-offset-2">
            Sign in
          </a>
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
  const [inbox, setInbox] = useState<any[]>([])
  const [popup, setPopup] = useState<string | null>(null)
  const [sending, setSending] = useState<string | null>(null)
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const notifTypes = [
    { key: 'database-ping',  label: 'Database',    channels: ['database'],                       color: 'bg-blue-500',   icon: '🗄️' },
    { key: 'mail-ping',      label: 'Mail',         channels: ['mail'],                           color: 'bg-green-500',  icon: '✉️' },
    { key: 'broadcast-ping', label: 'Broadcast',    channels: ['broadcast', 'database'],          color: 'bg-purple-500', icon: '📡' },
    { key: 'all-channels',   label: 'All Channels', channels: ['database', 'mail', 'broadcast'],  color: 'bg-orange-500', icon: '🔔' },
  ]

  const loadInbox = async () => {
    setLoading(true)
    try {
      const res = await arkzenFetch('/api/notification-test/inbox')
      const d = await res.json()
      const items = d.data ?? []
      setInbox(items)
      setUnread(items.filter((n: any) => !n.read_at).length)
    } catch (err) {
      console.error('Failed to load inbox:', err)
    } finally {
      setLoading(false)
    }
  }

  // ─────────────────────────────────────────────
  // RAW WEBSOCKET — Reverb private channel, no pusher-js
  //
  // Flow (Pusher protocol over raw WS):
  //   1. Open WS to Reverb
  //   2. Receive pusher:connection_established → get socket_id
  //   3. POST /broadcasting/auth with socket_id + channel name
  //      (using the tatemono-scoped token via arkzenFetch)
  //   4. Send pusher:subscribe with the auth signature from step 3
  //   5. Listen for .notification-test.notification events
  // ─────────────────────────────────────────────
  const connectReverb = (userId: number, token: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setWsStatus('connecting')
    const channelName = `private-notification-test.${userId}`
    const url = `${REVERB_SCHEME}://${REVERB_HOST}:${REVERB_PORT}/app/${APP_KEY}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) return
      // Reverb will respond with pusher:connection_established containing the socket_id
    }

    ws.onmessage = async (event) => {
      if (!mountedRef.current) return
      try {
        const msg = JSON.parse(event.data) as { event: string; data: unknown }

        if (msg.event === 'pusher:connection_established') {
          // Step 2: got socket_id — now authenticate the private channel
          setWsStatus('connected')
          const connData = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data
          const socketId = (connData as any).socket_id as string

          // Step 3: POST to Laravel's broadcasting auth endpoint
          // arkzenFetch already attaches the Bearer token + correct headers
          const authRes = await arkzenFetch('/api/notification-test/auth/broadcasting/auth', {
            method: 'POST',
            body: JSON.stringify({ socket_id: socketId, channel_name: channelName }),
          })

          if (!authRes.ok) {
            console.error('[Arkzen WS] Channel auth failed:', authRes.status)
            setWsStatus('error')
            return
          }

          const authData = await authRes.json()

          // Step 4: subscribe with the signed auth token from Laravel
          ws.send(JSON.stringify({
            event: 'pusher:subscribe',
            data: {
              channel: channelName,
              auth: authData.auth,
            },
          }))
        }

        // Step 5: incoming broadcast notification
        if (msg.event === 'notification-test.notification') {
          const payload = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data
          setPopup((payload as any).message ?? 'New notification received!')
          setTimeout(() => setPopup(null), 4000)
          loadInbox()
        }
      } catch (err) {
        console.error('[Arkzen WS] Failed to parse message:', err)
      }
    }

    ws.onerror = () => {
      // Connection will be closed and automatically reconnected via onclose
      ws.close()
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      setWsStatus('error')
      // Auto-reconnect after 3 s — same pattern as useWebSocket.ts
      reconnectTimeout.current = setTimeout(() => {
        if (mountedRef.current) connectReverb(userId, token)
      }, 3000)
    }
  }

  useEffect(() => {
    mountedRef.current = true
    loadInbox()

    const token = useAuthStore.getState().token
    if (token && user?.id) {
      // Delay connection to avoid Strict Mode double-mount race condition
      const timeoutId = setTimeout(() => {
        if (mountedRef.current) connectReverb(user.id, token)
      }, 50)
      return () => clearTimeout(timeoutId)
    }

    return () => {
      mountedRef.current = false
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current)
      wsRef.current?.close()
    }
  }, [user?.id])

  const trigger = async (key: string) => {
    setSending(key)
    try {
      await arkzenFetch('/api/notification-test/trigger', {
        method: 'POST',
        body: JSON.stringify({ notification: key }),
      })
      setTimeout(loadInbox, 800)
    } catch (err) {
      console.error('Failed to trigger notification:', err)
    } finally {
      setSending(null)
    }
  }

  const readAll = async () => {
    try {
      await arkzenFetch('/api/notification-test/inbox/read-all', { method: 'POST' })
      loadInbox()
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  const deleteNotification = async (id: number) => {
    try {
      await arkzenFetch(`/api/notification-test/inbox/${id}`, { method: 'DELETE' })
      loadInbox()
    } catch (err) {
      console.error('Failed to delete notification:', err)
    }
  }

  const handleLogout = async () => {
    wsRef.current?.close()
    await logout()
    router.refresh()
    router.replace('/notification-test/login')
  }

  const statusColor = {
    connecting: 'bg-yellow-400',
    connected:  'bg-green-400',
    error:      'bg-red-400',
  }

  return (
    <div className="min-h-screen p-8">
      {popup && (
        <div className="fixed top-5 right-5 z-50 bg-neutral-900 text-white text-sm rounded-2xl px-5 py-3 shadow-xl flex items-center gap-2 animate-fade-in">
          <span>🔔</span> {popup}
        </div>
      )}

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🔔 Notification Test</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Signed in as <span className="font-medium">{user?.email}</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${statusColor[wsStatus]}`} />
              <span className="text-neutral-500 capitalize">{wsStatus}</span>
            </div>
            <button
              className="text-xs text-neutral-400 hover:text-neutral-700"
              onClick={handleLogout}
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-neutral-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-neutral-900">{unread}</div>
              <div className="text-sm text-neutral-500">Unread notifications</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-neutral-900">{inbox.length}</div>
              <div className="text-sm text-neutral-500">Total notifications</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {notifTypes.map(n => (
            <div key={n.key} className="bg-white rounded-2xl border border-neutral-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span>{n.icon}</span>
                <span className="font-medium text-sm">{n.label}</span>
              </div>
              <div className="text-xs text-neutral-400 mb-3">{n.channels.join(' + ')}</div>
              <button
                className="arkzen-btn w-full text-sm"
                onClick={() => trigger(n.key)}
                disabled={!!sending}
              >
                {sending === n.key ? 'Sending...' : 'Trigger'}
              </button>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="font-semibold">Database inbox ({unread} unread)</h2>
            <div className="flex gap-3">
              {unread > 0 && (
                <button className="text-xs text-neutral-500 hover:text-neutral-900" onClick={readAll}>
                  Mark all read
                </button>
              )}
              <button className="text-xs text-neutral-400 hover:text-neutral-700" onClick={loadInbox}>
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
          {inbox.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-400">
              No notifications yet. Trigger one above.
            </div>
          ) : (
            <div className="divide-y divide-neutral-50">
              {inbox.map((n) => {
                const data = n.data && typeof n.data === 'string' ? JSON.parse(n.data) : (n.data || {})
                return (
                  <div key={n.id} className={`px-5 py-3 flex items-center gap-3 ${!n.read_at ? 'bg-blue-50/40' : ''}`}>
                    {!n.read_at && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                    {n.read_at && <div className="w-1.5 h-1.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-700 truncate">
                        {data.message ?? 'Notification'}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {data.subject ?? n.type} · {n.created_at?.slice(0, 19).replace('T', ' ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {n.read_at && <span className="text-xs text-neutral-300">read</span>}
                      <button
                        className="text-xs text-red-400 hover:text-red-600"
                        onClick={() => deleteNotification(n.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {wsStatus === 'error' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800">
            <strong>WebSocket not connected.</strong> Make sure Laravel Reverb is running:{' '}
            <code className="bg-amber-100 px-1 rounded">php artisan reverb:start</code>
          </div>
        )}

        <div className="text-xs text-neutral-400 bg-neutral-50 rounded-xl p-4">
          <strong>Channels tested:</strong><br/>
          🗄️ <strong>database</strong> — stored in native notifications table, shown in inbox above<br/>
          ✉️ <strong>mail</strong> — sent to {user?.email} (check Mailtrap)<br/>
          📡 <strong>broadcast</strong> — fires WebSocket event via Reverb, shows popup top-right<br/>
          Run <code>php artisan reverb:start</code> for broadcast + <code>php artisan queue:work</code> for mail.
        </div>
      </div>
    </div>
  )
}
/* @arkzen:page:dashboard:end */