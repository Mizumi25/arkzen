/* @arkzen:meta
name: events-test
version: 1.0.0
description: Tests Laravel Events + Listeners pipeline. Fire events manually, see listeners execute asynchronously, inspect the event chain.
auth: true
*/

/* @arkzen:config
toast:
  position: top-right
  duration: 4000
layout:
  guest:
    className: "min-h-screen bg-neutral-50"
  auth:
    className: "min-h-screen bg-neutral-50"
*/

/* @arkzen:database:event_log
columns:
  event_name: string
  listener_name: string
  status: string
  payload: text
  duration_ms: integer
timestamps: true
*/

/* @arkzen:api
middleware: [auth]
routes:
  - GET  /events-test/log      → index
  - POST /events-test/fire     → store
  - POST /events-test/log/clear → clearLog
*/

/* @arkzen:events
user-signed-up:
  listeners: [SendWelcomeEmail, UpdateUserStats, NotifyAdmins]
order-placed:
  listeners: [ProcessPayment, UpdateInventory, SendOrderConfirmation]
data-exported:
  listeners: [LogExportActivity, CleanupTempFiles]
*/

/* @arkzen:components:shared */

'use client'

import React, { useState, useEffect } from 'react'
import { useAuthStore, arkzenFetch } from '@/arkzen/core/stores/authStore'

/* @arkzen:components:shared:end */

/* @arkzen:page:login */
/* @arkzen:page:layout:guest */
const LoginPage = () => {
  const { login, isLoading } = useAuthStore()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const handleSubmit = async () => {
    setError(null)
    try { await login(email, password) }
    catch (e) { setError(e instanceof Error ? e.message : 'Login failed') }
  }
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-6">Events Test — Login</h1>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
        <div className="space-y-3">
          <input className="arkzen-input w-full" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
          <input className="arkzen-input w-full" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
          <button className="arkzen-btn w-full" onClick={handleSubmit} disabled={isLoading}>{isLoading ? 'Signing in...' : 'Sign In'}</button>
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

  const events = [
    {
      key: 'user-signed-up',
      label: 'UserSignedUp',
      desc: 'Fires 3 listeners: SendWelcomeEmail, UpdateUserStats, NotifyAdmins',
      payload: { user_id: 1, email: 'test@example.com', name: 'Test User' },
      color: 'text-blue-600 bg-blue-50',
    },
    {
      key: 'order-placed',
      label: 'OrderPlaced',
      desc: 'Fires 3 listeners: ProcessPayment, UpdateInventory, SendOrderConfirmation',
      payload: { order_id: 'ORD-9999', total: 149.99, items: 3 },
      color: 'text-green-600 bg-green-50',
    },
    {
      key: 'data-exported',
      label: 'DataExported',
      desc: 'Fires 2 listeners: LogExportActivity, CleanupTempFiles',
      payload: { export_id: 'EXP-001', format: 'csv', rows: 250 },
      color: 'text-purple-600 bg-purple-50',
    },
  ]

  const [log, setLog]         = useState<any[]>([])
  const [firing, setFiring]   = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)

  const loadLog = async () => {
    try {
      const res = await arkzenFetch('/api/events-test/log')
      const d   = await res.json()
      setLog(d.data ?? [])
    } catch {}
  }

  useEffect(() => { loadLog() }, [])

  const fire = async (eventKey: string, payload: object) => {
    setFiring(eventKey)
    try {
      await arkzenFetch('/api/events-test/fire', {
        method: 'POST',
        body: JSON.stringify({ event: eventKey, payload }),
      })
      // Poll for listener results — they run async
      setTimeout(loadLog, 600)
      setTimeout(loadLog, 1500)
      setTimeout(loadLog, 3000)
    } catch {} finally {
      setFiring(null)
    }
  }

  const clearLog = async () => {
    setClearing(true)
    try {
      await arkzenFetch('/api/events-test/log/clear', { method: 'POST' })
      setLog([])
    } catch {} finally {
      setClearing(false)
    }
  }

  const statusColor = (s: string) => ({
    completed: 'bg-green-100 text-green-700',
    running:   'bg-yellow-100 text-yellow-700',
    failed:    'bg-red-100 text-red-700',
  }[s] ?? 'bg-neutral-100 text-neutral-600')

  // Group log entries by event_name
  const grouped = log.reduce((acc: Record<string, any[]>, entry: any) => {
    const key = `${entry.event_name}:${entry.created_at?.slice(0, 19)}`
    if (!acc[key]) acc[key] = []
    acc[key].push(entry)
    return acc
  }, {})

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">⚡ Events Test</h1>
            <p className="text-sm text-neutral-500 mt-1">Each event fires its listeners as queued jobs.</p>
          </div>
          <button className="arkzen-btn-ghost text-sm" onClick={logout}>Logout ({user?.name})</button>
        </div>

        {/* Event fire buttons */}
        <div className="space-y-3">
          {events.map(ev => (
            <div key={ev.key} className="bg-white rounded-2xl border border-neutral-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${ev.color}`}>{ev.label}</span>
                  </div>
                  <div className="text-xs text-neutral-500">{ev.desc}</div>
                  <div className="text-xs text-neutral-400 mt-1 font-mono">
                    payload: {JSON.stringify(ev.payload)}
                  </div>
                </div>
                <button
                  className="arkzen-btn text-sm shrink-0"
                  onClick={() => fire(ev.key, ev.payload)}
                  disabled={!!firing}
                >
                  {firing === ev.key ? 'Firing...' : 'Fire'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Event log */}
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="font-semibold">Listener execution log</h2>
            <div className="flex gap-3">
              <button className="text-xs text-neutral-400" onClick={loadLog}>Refresh</button>
              {log.length > 0 && (
                <button className="text-xs text-red-400" onClick={clearLog} disabled={clearing}>
                  {clearing ? 'Clearing...' : 'Clear'}
                </button>
              )}
            </div>
          </div>

          {Object.keys(grouped).length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-400">
              No events fired yet. Fire an event above — listener results appear here.
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {Object.entries(grouped).map(([groupKey, entries]) => (
                <div key={groupKey} className="px-5 py-3">
                  <div className="text-xs font-medium text-neutral-500 mb-2">
                    🔥 {(entries[0] as any).event_name} — {(entries[0] as any).created_at?.slice(11, 19)}
                  </div>
                  <div className="space-y-1.5 pl-3 border-l-2 border-neutral-100">
                    {(entries as any[]).map((e, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-neutral-600 font-mono">{e.listener_name}</span>
                        <div className="flex items-center gap-2">
                          {e.duration_ms && <span className="text-neutral-400">{e.duration_ms}ms</span>}
                          <span className={`px-1.5 py-0.5 rounded-md font-medium ${statusColor(e.status)}`}>{e.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-neutral-400 bg-neutral-50 rounded-xl p-4">
          <strong>How it works:</strong> The backend fires the Arkzen-generated Event class, which triggers Laravel's event dispatcher. Each listener is a queued job implementing ShouldQueue. Run <code>php artisan queue:work</code> to process them. The controller logs each listener execution to the event_log table.
        </div>
      </div>
    </div>
  )
}
/* @arkzen:page:dashboard:end */
