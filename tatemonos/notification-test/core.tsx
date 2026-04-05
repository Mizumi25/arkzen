/* @arkzen:meta
name: notification-test
version: 1.0.0
description: Tests Laravel Notifications across all three channels — database (bell), mail, and broadcast (real-time popup).
auth: false
*/

/* @arkzen:config
toast:
  position: top-right
  duration: 5000
layout:
  guest:
    className: "min-h-screen bg-neutral-50"
*/

/* @arkzen:database:notification_tests
columns:
  triggered_by: integer
  channel: string
  message: string
timestamps: true
*/

/* @arkzen:api
middleware: []
routes:
  - GET    /notification-test/inbox          → index
  - POST   /notification-test/trigger        → store
  - DELETE /notification-test/inbox/{id}     → destroy
  - POST   /notification-test/inbox/read-all → readAll
*/

/* @arkzen:notifications
database-ping:
  channels: [database]
  message: "You have a new database notification"
  subject: "Database Ping
mail-ping:
  channels: [mail]
  message: "This is a test mail notification"
  subject: "Mail Ping from Arkzen"
broadcast-ping:
  channels: [broadcast, database]
  message: "Real-time notification received!"
  subject: "Broadcast Ping"
all-channels:
  channels: [database, mail, broadcast]
  message: "This notification was sent to all three channels simultaneously"
  subject: "All Channels Test"
*/

/* @arkzen:components:shared */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { arkzenFetch } from '@/arkzen/core/stores/authStore'

/* @arkzen:components:shared:end */



/* @arkzen:page:dashboard */
/* @arkzen:page:layout:guest */
const DashboardPage = () => {
  const [inbox, setInbox]           = useState<any[]>([])
  const [popup, setPopup]           = useState<string | null>(null)
  const [sending, setSending]       = useState<string | null>(null)
  const [unread, setUnread]         = useState(0)
  const wsRef = useRef<WebSocket | null>(null)

  const notifTypes = [
    { key: 'database-ping',  label: 'Database',   channels: ['database'],              color: 'bg-blue-500',   icon: '🗄️' },
    { key: 'mail-ping',      label: 'Mail',        channels: ['mail'],                  color: 'bg-green-500',  icon: '✉️' },
    { key: 'broadcast-ping', label: 'Broadcast',   channels: ['broadcast', 'database'], color: 'bg-purple-500', icon: '📡' },
    { key: 'all-channels',   label: 'All Channels', channels: ['database', 'mail', 'broadcast'], color: 'bg-orange-500', icon: '🔔' },
  ]

  const loadInbox = async () => {
    try {
      const res = await arkzenFetch('/api/notification-test/inbox')
      const d   = await res.json()
      const items = d.data ?? []
      setInbox(items)
      setUnread(items.filter((n: any) => !n.read_at).length)
    } catch {}
  }

  useEffect(() => {
    loadInbox()

    // WebSocket for broadcast notifications
    try {
      const ws = new WebSocket('ws://localhost:8080/app/arkzen-key')
      wsRef.current = ws
      ws.onopen = () => {
        ws.send(JSON.stringify({
          event: 'pusher:subscribe',
          data: { channel: `private-App.Models.User.${user?.id}`, auth: token }
        }))
      }
      ws.onmessage = (e) => {
        const payload = JSON.parse(e.data)
        if (payload.event?.includes('notification')) {
          const data = JSON.parse(payload.data ?? '{}')
          setPopup(data.message ?? 'New notification received!')
          setTimeout(() => setPopup(null), 4000)
          loadInbox()
        }
      }
      return () => ws.close()
    } catch {}
  }, [])

  const trigger = async (key: string) => {
    setSending(key)
    try {
      await arkzenFetch('/api/notification-test/trigger', {
        method: 'POST',
        body: JSON.stringify({ notification: key }),
      })
      setTimeout(loadInbox, 800)
    } catch {} finally {
      setSending(null)
    }
  }

  const readAll = async () => {
    await arkzenFetch('/api/notification-test/inbox/read-all', { method: 'POST' })
    loadInbox()
  }

  return (
    <div className="min-h-screen p-8">
      {/* Broadcast popup */}
      {popup && (
        <div className="fixed top-5 right-5 z-50 bg-neutral-900 text-white text-sm rounded-2xl px-5 py-3 shadow-xl flex items-center gap-2 animate-fade-in">
          <span>🔔</span> {popup}
        </div>
      )}

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">🔔 Notification Test</h1>
            {unread > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unread}</span>
            )}
          </div>
          
        </div>

        {/* Trigger buttons */}
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

        {/* Inbox */}
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="font-semibold">Database inbox ({unread} unread)</h2>
            <div className="flex gap-3">
              {unread > 0 && (
                <button className="text-xs text-neutral-500 hover:text-neutral-900" onClick={readAll}>Mark all read</button>
              )}
              <button className="text-xs text-neutral-400 hover:text-neutral-700" onClick={loadInbox}>Refresh</button>
            </div>
          </div>
          {inbox.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-400">No notifications yet. Trigger one above.</div>
          ) : (
            <div className="divide-y divide-neutral-50">
              {inbox.map((n, i) => (
                <div key={i} className={`px-5 py-3 flex items-center gap-3 ${!n.read_at ? 'bg-blue-50/40' : ''}`}>
                  {!n.read_at && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                  {n.read_at && <div className="w-1.5 h-1.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-700 truncate">{n.data?.message ?? 'Notification'}</p>
                    <p className="text-xs text-neutral-400">{n.data?.tatemono ?? ''} · {n.created_at}</p>
                  </div>
                  {n.read_at && <span className="text-xs text-neutral-300">read</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-neutral-400 bg-neutral-50 rounded-xl p-4">
          <strong>Channels tested:</strong><br/>
          🗄️ <strong>database</strong> — stored in notifications table, shown in inbox above<br/>
          ✉️ <strong>mail</strong> — sent to {user?.email} (check Mailtrap)<br/>
          📡 <strong>broadcast</strong> — fires WebSocket event, shows popup top-right<br/>
          Run <code>php artisan reverb:start</code> for broadcast + <code>php artisan queue:work</code> for mail.
        </div>
      </div>
    </div>
  )
}
/* @arkzen:page:dashboard:end */