/* @arkzen:meta
name: events-test
version: 1.0.0
description: Tests Laravel Events + Listeners pipeline. Fire events manually, see listeners execute asynchronously, inspect the event chain.
auth: false
*/

/* @arkzen:config
toast:
  position: top-right
  duration: 4000
layout:
  guest:
    className: "min-h-screen bg-neutral-50"
*/

/* @arkzen:database:event_log
table: event_log
timestamps: true
softDeletes: false
columns:
  id:
    type: integer
    primary: true
    autoIncrement: true
  event_name:
    type: string
    length: 255
    nullable: false
  listener_name:
    type: string
    length: 255
    nullable: false
  status:
    type: string
    length: 50
    default: completed
  payload:
    type: text
    nullable: true
  duration_ms:
    type: integer
    nullable: true
*/

/* @arkzen:api:event_log
model: EventLog
controller: EventLogController
prefix: /api/events-test
middleware: []
endpoints:
  index:
    method: GET
    route: /log
    description: Get event log entries
    response:
      type: paginated
  store:
    method: POST
    route: /fire
    description: Fire an event
    type: event_fire
    validation:
      event: required|string
      payload: nullable|array
    response:
      type: single
  clearLog:
    method: POST
    route: /log/clear
    description: Clear all log entries
    response:
      type: message
      value: Log cleared
*/

/* @arkzen:events:user-signed-up
listeners: [SendWelcomeEmail, UpdateUserStats, NotifyAdmins]
*/
/* @arkzen:events:user-signed-up:end */

/* @arkzen:events:order-placed
listeners: [ProcessPayment, UpdateInventory, SendOrderConfirmation]
*/
/* @arkzen:events:order-placed:end */

/* @arkzen:events:data-exported
listeners: [LogExportActivity, CleanupTempFiles]
*/
/* @arkzen:events:data-exported:end */

/* @arkzen:components:shared */

'use client'

import React, { useState, useEffect } from 'react'
import { Flame, Zap } from 'lucide-react'
import { arkzenFetch } from '@/arkzen/core/stores/authStore'

interface EventLogEntry {
  id:           number
  event_name:   string
  listener_name: string
  status:       string
  payload:      string | null
  duration_ms:  number | null
  created_at:   string
}

/* @arkzen:components:shared:end */

/* @arkzen:page:index */
/* @arkzen:page:layout:guest */
const IndexPage = () => {
  const events = [
    {
      key:     'user-signed-up',
      label:   'UserSignedUp',
      desc:    'Fires 3 listeners: SendWelcomeEmail, UpdateUserStats, NotifyAdmins',
      payload: { user_id: 1, email: 'test@example.com', name: 'Test User' },
      color:   'text-blue-600 bg-blue-50',
    },
    {
      key:     'order-placed',
      label:   'OrderPlaced',
      desc:    'Fires 3 listeners: ProcessPayment, UpdateInventory, SendOrderConfirmation',
      payload: { order_id: 'ORD-9999', total: 149.99, items: 3 },
      color:   'text-green-600 bg-green-50',
    },
    {
      key:     'data-exported',
      label:   'DataExported',
      desc:    'Fires 2 listeners: LogExportActivity, CleanupTempFiles',
      payload: { export_id: 'EXP-001', format: 'csv', rows: 250 },
      color:   'text-purple-600 bg-purple-50',
    },
  ]

  const [log, setLog]           = useState<EventLogEntry[]>([])
  const [firing, setFiring]     = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)
  const pollingRef = React.useRef<NodeJS.Timeout | null>(null)

  const loadLog = async () => {
    try {
      const res = await arkzenFetch('/api/events-test/log')
      const d   = await res.json()
      setLog(d.data ?? [])
    } catch (e) {
      console.error('Failed to load log:', e)
    }
  }

  useEffect(() => { loadLog() }, [])

  const fire = async (eventKey: string, payload: object) => {
    setFiring(eventKey)
    try {
      await arkzenFetch('/api/events-test/fire', {
        method: 'POST',
        body:   JSON.stringify({ event: eventKey, payload }),
      })
      // Start aggressive polling immediately
      if (pollingRef.current) clearInterval(pollingRef.current)
      
      // Poll immediately and every 500ms
      loadLog()
      pollingRef.current = setInterval(loadLog, 500)
      
      // Stop after 15 seconds
      setTimeout(() => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
      }, 15000)
    } catch (e) {
      console.error('Fire failed:', e)
    } finally { 
      setFiring(null) 
    }
  }

  const clearLog = async () => {
    setClearing(true)
    try {
      await arkzenFetch('/api/events-test/log/clear', { method: 'POST' })
      setLog([])
    } catch {} finally { setClearing(false) }
  }

  const statusColor = (s: string) => ({
    completed: 'bg-green-100 text-green-700',
    running:   'bg-yellow-100 text-yellow-700',
    failed:    'bg-red-100 text-red-700',
  }[s] ?? 'bg-neutral-100 text-neutral-600')

  const grouped = log.reduce((acc: Record<string, EventLogEntry[]>, entry) => {
    const key = `${entry.event_name}:${entry.created_at?.slice(0, 19)}`
    if (!acc[key]) acc[key] = []
    acc[key].push(entry)
    return acc
  }, {})

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Zap size={20} /> Events Test</h1>
          <p className="text-sm text-neutral-500 mt-1">Each event fires its listeners as queued jobs.</p>
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
                  <div className="text-xs font-medium text-neutral-500 mb-2 flex items-center gap-1">
                    <Flame size={13} className="text-amber-500" /> {entries[0].event_name} — {entries[0].created_at?.slice(11, 19)}
                  </div>
                  <div className="space-y-1.5 pl-3 border-l-2 border-neutral-100">
                    {entries.map((e, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-neutral-600 font-mono">{e.listener_name}</span>
                        <div className="flex items-center gap-2">
                          {e.duration_ms !== null && <span className="text-neutral-400">{e.duration_ms}ms</span>}
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
          <strong>How it works:</strong> The backend fires the Arkzen-generated Event class → Laravel event dispatcher → each listener is a queued job (ShouldQueue). Run <code>php artisan queue:work</code> to process them.
        </div>
      </div>
    </div>
  )
}
/* @arkzen:page:index:end */
