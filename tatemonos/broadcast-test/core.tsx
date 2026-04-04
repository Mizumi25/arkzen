/* @arkzen:meta
name: broadcast-test
version: 1.0.0
description: Tests Laravel Reverb broadcasting end-to-end. Public channel live counter + private channel authenticated feed.
auth: true
*/

/* @arkzen:config
toast:
  position: top-right
  duration: 3000
layout:
  auth:
    className: "min-h-screen bg-neutral-50"
  guest:
    className: "min-h-screen bg-neutral-50"
*/

/* @arkzen:database:messages
columns:
  content: string
  user_id: integer
  channel: string
timestamps: true
*/

/* @arkzen:api
middleware: [auth]
routes:
  - GET    /broadcast-test/messages         → index
  - POST   /broadcast-test/messages         → store
  - DELETE /broadcast-test/messages/{id}    → destroy
*/

/* @arkzen:realtime
events:
  message-sent:
    channel: broadcast-test-public
    type: public
  private-message:
    channel: broadcast-test-private
    type: private
channels:
  broadcast-test-private:
    type: private
    auth: authenticated
*/

/* @arkzen:components:shared */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useAuthStore, arkzenFetch } from '@/arkzen/core/stores/authStore'

/* @arkzen:components:shared:end */

/* @arkzen:page:login */
/* @arkzen:page:layout:guest */
const LoginPage = () => {
  const { login, isLoading } = useAuthStore()
  const [email, setEmail]       = useState('test@example.com')
  const [password, setPassword] = useState('password')
  const [error, setError]       = useState<string | null>(null)

  const handleSubmit = async () => {
    setError(null)
    try { await login(email, password) }
    catch (e) { setError(e instanceof Error ? e.message : 'Login failed') }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-6">Broadcast Test — Login</h1>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
        <div className="space-y-3">
          <input className="arkzen-input w-full" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
          <input className="arkzen-input w-full" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
          <button className="arkzen-btn w-full" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  )
}
/* @arkzen:page:login:end */

/* @arkzen:page:dashboard */
/* @arkzen:page:layout:auth */
const DashboardPage = () => {
  const { user, logout } = useAuthStore()
  const [messages, setMessages]   = useState<any[]>([])
  const [input, setInput]         = useState('')
  const [publicCount, setPublicCount] = useState(0)
  const [wsStatus, setWsStatus]   = useState<'connecting' | 'connected' | 'error'>('connecting')
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    // Load existing messages
    arkzenFetch('/api/broadcast-test/messages')
      .then(r => r.json())
      .then(d => setMessages(d.data ?? []))
      .catch(() => {})

    // Connect to Reverb WebSocket
    try {
      const ws = new WebSocket(`ws://localhost:8080/app/arkzen-key`)
      wsRef.current = ws

      ws.onopen = () => {
        setWsStatus('connected')
        // Subscribe to public channel
        ws.send(JSON.stringify({
          event: 'pusher:subscribe',
          data: { channel: 'broadcast-test-public' }
        }))
      }

      ws.onmessage = (e) => {
        const payload = JSON.parse(e.data)
        if (payload.event === 'broadcast-test.message-sent') {
          const data = JSON.parse(payload.data)
          setMessages(prev => [data, ...prev].slice(0, 50))
          setPublicCount(c => c + 1)
        }
      }

      ws.onerror = () => setWsStatus('error')
      ws.onclose = () => setWsStatus('error')

      return () => ws.close()
    } catch {
      setWsStatus('error')
    }
  }, [])

  const sendMessage = async () => {
    if (!input.trim()) return
    try {
      await arkzenFetch('/api/broadcast-test/messages', {
        method: 'POST',
        body: JSON.stringify({ content: input })
      })
      setInput('')
    } catch (e) {
      console.error(e)
    }
  }

  const statusColor = { connecting: 'bg-yellow-400', connected: 'bg-green-400', error: 'bg-red-400' }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">📡 Broadcast Test</h1>
            <p className="text-sm text-neutral-500 mt-1">Logged in as <strong>{user?.name}</strong></p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${statusColor[wsStatus]}`} />
              <span className="text-neutral-600 capitalize">{wsStatus}</span>
            </div>
            <button className="arkzen-btn-ghost text-sm" onClick={logout}>Logout</button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-neutral-100">
            <div className="text-3xl font-bold text-neutral-900">{publicCount}</div>
            <div className="text-sm text-neutral-500 mt-1">Events received this session</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-neutral-100">
            <div className="text-3xl font-bold text-neutral-900">{messages.length}</div>
            <div className="text-sm text-neutral-500 mt-1">Total messages in DB</div>
          </div>
        </div>

        {/* Send message */}
        <div className="bg-white rounded-2xl p-5 border border-neutral-100">
          <h2 className="font-semibold mb-3">Send broadcast message</h2>
          <div className="flex gap-2">
            <input
              className="arkzen-input flex-1"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message and hit Enter..."
            />
            <button className="arkzen-btn" onClick={sendMessage}>Send</button>
          </div>
          <p className="text-xs text-neutral-400 mt-2">
            This triggers POST /api/broadcast-test/messages → Laravel broadcasts MessageSent event → all connected clients receive it in real-time.
          </p>
        </div>

        {/* Message feed */}
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100">
            <h2 className="font-semibold">Live feed</h2>
          </div>
          {messages.length === 0 ? (
            <div className="p-8 text-center text-neutral-400 text-sm">No messages yet. Send one above.</div>
          ) : (
            <div className="divide-y divide-neutral-50">
              {messages.map((m, i) => (
                <div key={i} className="px-5 py-3 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-medium shrink-0">
                    {m.user?.name?.[0] ?? '?'}
                  </div>
                  <div>
                    <span className="text-sm font-medium">{m.user?.name ?? 'Unknown'}</span>
                    <p className="text-sm text-neutral-600">{m.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* WebSocket error help */}
        {wsStatus === 'error' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800">
            <strong>WebSocket not connected.</strong> Make sure Laravel Reverb is running:{' '}
            <code className="bg-amber-100 px-1 rounded">php artisan reverb:start</code>
          </div>
        )}
      </div>
    </div>
  )
}
/* @arkzen:page:dashboard:end */
