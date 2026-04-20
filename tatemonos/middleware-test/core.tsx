/* @arkzen:meta
name: middleware-test
version: 1.0.0
description: "Tests MiddlewareBuilder v6.0 custom (non-built-in) middleware generation. Declares [requireJson] — not a Laravel built-in — so MiddlewareBuilder generates a scoped stub at app/Http/Middleware/Arkzen/MiddlewareTest/RequireJson.php for you to fill in."
auth: false
*/

/* @arkzen:database:ping_logs
table: ping_logs
timestamps: true
softDeletes: false
columns:
  message:
    type: string
    nullable: false
  headers_ok:
    type: boolean
    default: false
seeder:
  count: 2
  data:
    - message: First ping
      headers_ok: true
    - message: Second ping
      headers_ok: false
*/

/* @arkzen:api:ping_logs
model: PingLog
controller: PingLogController
prefix: /api/middleware-test
middleware: [requireJson]
endpoints:
  index:
    method: GET
    route: /ping
    description: Returns all ping logs — passes through requireJson middleware stub
    response:
      type: collection
  store:
    method: POST
    route: /ping
    description: Create a ping log entry
    validation:
      message: required|string|max:255
      headers_ok: sometimes|boolean
    response:
      type: single
*/

/* @arkzen:components:shared */

'use client'

import React, { useState, useEffect } from 'react'
import { arkzenFetch } from '@/arkzen/core/stores/authStore'

/* @arkzen:components:shared:end */

/* @arkzen:page:index */
/* @arkzen:page:layout:guest */
const IndexPage = () => {
  const [logs,    setLogs]    = useState<any[]>([])
  const [message, setMessage] = useState('')
  const [result,  setResult]  = useState<{ status: 'idle' | 'pass' | 'fail'; text: string }>({ status: 'idle', text: '' })
  const [loading, setLoading] = useState(false)

  const loadLogs = async () => {
    try {
      const res = await fetch('/api/middleware-test/ping', {
        headers: { 'Accept': 'application/json' },
      })
      const d = await res.json()
      setLogs(d.data ?? d ?? [])
    } catch {}
  }

  useEffect(() => { loadLogs() }, [])

  const sendPing = async () => {
    setLoading(true)
    setResult({ status: 'idle', text: 'Sending...' })
    try {
      const res = await fetch('/api/middleware-test/ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept':       'application/json',
        },
        body: JSON.stringify({ message: message || 'Test ping', headers_ok: true }),
      })
      const d = await res.json()
      if (res.ok) {
        setResult({ status: 'pass', text: '✓ Request passed through requireJson middleware stub' })
        setMessage('')
        setTimeout(loadLogs, 300)
      } else {
        setResult({ status: 'fail', text: d.message ?? '✗ Request blocked' })
      }
    } catch (e) {
      setResult({ status: 'fail', text: e instanceof Error ? e.message : 'Request failed' })
    } finally {
      setLoading(false)
    }
  }

  const resultStyle =
    result.status === 'pass' ? 'bg-green-50 border-green-200 text-green-700' :
    result.status === 'fail' ? 'bg-red-50 border-red-200 text-red-700' :
    'bg-neutral-50 border-neutral-200 text-neutral-500'

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">🔧 Middleware Test</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Tests <code>MiddlewareBuilder</code> custom stub generation.
          </p>
        </div>

        {/* What was generated */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5 space-y-2">
          <div className="font-medium text-sm">What Arkzen generated</div>
          <div className="text-xs text-neutral-500 space-y-1">
            <p>
              Declaring <code>middleware: [requireJson]</code> in the DSL triggered{' '}
              <code>MiddlewareBuilder::generateCustomMiddleware()</code>.
            </p>
            <p>
              A scoped stub was created at:
            </p>
            <code className="block bg-neutral-50 rounded-lg p-2 text-neutral-700">
              app/Http/Middleware/Arkzen/MiddlewareTest/RequireJson.php
            </code>
            <p>
              The route file registered it locally via:
            </p>
            <code className="block bg-neutral-50 rounded-lg p-2 text-neutral-700">
              {"app('router')->aliasMiddleware('requireJson', \\App\\Http\\Middleware\\Arkzen\\MiddlewareTest\\RequireJson::class);"}
            </code>
            <p className="text-amber-600">
              ⚠ The stub currently passes all requests through. Fill in{' '}
              <code>handle()</code> to add real logic (e.g. enforce Content-Type: application/json).
            </p>
          </div>
        </div>

        {/* Send ping */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5 space-y-3">
          <div className="font-medium text-sm">Send a ping through the middleware</div>
          <div className="flex gap-2">
            <input
              className="arkzen-input flex-1"
              placeholder="Optional message"
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
            <button
              className="arkzen-btn"
              onClick={sendPing}
              disabled={loading}
            >
              {loading ? '...' : 'Ping'}
            </button>
          </div>
          {result.text && (
            <div className={`p-3 rounded-xl border text-sm ${resultStyle}`}>
              {result.text}
            </div>
          )}
        </div>

        {/* Log table */}
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="font-semibold">Ping log</h2>
            <button className="text-xs text-neutral-400" onClick={loadLogs}>Refresh</button>
          </div>
          {logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-400">No pings yet.</div>
          ) : (
            <div className="divide-y divide-neutral-50">
              {logs.map((l, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <span className="text-sm">{l.message}</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    l.headers_ok ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    {l.headers_ok ? 'ok' : 'stub'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
/* @arkzen:page:index:end */