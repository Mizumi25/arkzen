/* @arkzen:meta
name: middleware-test
version: 2.0.0
description: "Tests MiddlewareBuilder v7.0 body injection. Declares [requireJson] with real logic injected via @arkzen:middleware:requireJson DSL block. Also tests alias registration fix — previously requireJson was never registered as an alias so Laravel 500'd at runtime."
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
    description: Returns all ping logs — passes through requireJson middleware
    response:
      type: collection
  store:
    method: POST
    route: /ping
    description: Create a ping log entry — blocked by requireJson if Content-Type is wrong
    validation:
      message: required|string|max:255
      headers_ok: sometimes|boolean
    response:
      type: single
*/

/* @arkzen:middleware:requireJson
*/
if (!$request->isJson()) {
    return response()->json([
        'message' => 'Content-Type: application/json is required for this endpoint.',
        'hint'    => 'Set the Content-Type header to application/json',
    ], 415);
}
return $next($request);
/* @arkzen:middleware:requireJson:end */

/* @arkzen:components:shared */

'use client'

import React, { useState, useEffect } from 'react'

/* @arkzen:components:shared:end */

/* @arkzen:page:index */
/* @arkzen:page:layout:guest */
const IndexPage = () => {
  const [logs,    setLogs]    = useState<any[]>([])
  const [message, setMessage] = useState('')
  const [result,  setResult]  = useState<{ status: 'idle' | 'pass' | 'fail' | 'blocked'; text: string }>({ status: 'idle', text: '' })
  const [loading, setLoading] = useState(false)

  const loadLogs = async () => {
    try {
      const res = await fetch('/api/middleware-test/ping', {
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      })
      const d = await res.json()
      setLogs(d.data ?? d ?? [])
    } catch {}
  }

  useEffect(() => { loadLogs() }, [])

  const sendPing = async (withCorrectHeader: boolean) => {
    setLoading(true)
    setResult({ status: 'idle', text: 'Sending...' })
    try {
      const headers: Record<string, string> = { 'Accept': 'application/json' }
      if (withCorrectHeader) headers['Content-Type'] = 'application/json'

      const res = await fetch('/api/middleware-test/ping', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: message || 'Test ping', headers_ok: withCorrectHeader }),
      })
      const d = await res.json()
      if (res.ok) {
        setResult({ status: 'pass', text: '✓ Request passed — Content-Type was application/json' })
        setMessage('')
        setTimeout(loadLogs, 300)
      } else if (res.status === 415) {
        setResult({ status: 'blocked', text: `✗ Blocked by requireJson middleware — ${d.message}` })
      } else {
        setResult({ status: 'fail', text: d.message ?? '✗ Request failed' })
      }
    } catch (e) {
      setResult({ status: 'fail', text: e instanceof Error ? e.message : 'Request failed' })
    } finally {
      setLoading(false)
    }
  }

  const resultStyle =
    result.status === 'pass'    ? 'bg-green-50 border-green-200 text-green-700' :
    result.status === 'blocked' ? 'bg-amber-50 border-amber-200 text-amber-700' :
    result.status === 'fail'    ? 'bg-red-50 border-red-200 text-red-700' :
    'bg-neutral-50 border-neutral-200 text-neutral-500'

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">🔧 Middleware Test</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Tests <code>MiddlewareBuilder</code> v7.0 body injection + alias fix.
          </p>
        </div>

        {/* What was generated */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5 space-y-2">
          <div className="font-medium text-sm">What Arkzen generated</div>
          <div className="text-xs text-neutral-500 space-y-1">
            <p>
              <code>@arkzen:middleware:requireJson</code> block provided real PHP logic.
              MiddlewareBuilder v7.0 decoded it and injected into <code>handle()</code>.
            </p>
            <code className="block bg-neutral-50 rounded-lg p-2 text-neutral-700">
              app/Http/Middleware/Arkzen/MiddlewareTest/RequireJson.php
            </code>
            <p>
              Alias registered in route file (v7.0 fix):
            </p>
            <code className="block bg-neutral-50 rounded-lg p-2 text-neutral-700">
              {"app('router')->aliasMiddleware('requireJson', RequireJson::class);"}
            </code>
          </div>
        </div>

        {/* Test buttons */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5 space-y-3">
          <div className="font-medium text-sm">Test the middleware</div>
          <input
            className="arkzen-input w-full"
            placeholder="Optional message"
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              className="arkzen-btn flex-1 text-sm"
              onClick={() => sendPing(true)}
              disabled={loading}
            >
              ✓ Send with JSON header
            </button>
            <button
              className="arkzen-btn-ghost flex-1 text-sm"
              onClick={() => sendPing(false)}
              disabled={loading}
            >
              ✗ Send without JSON header
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
                    {l.headers_ok ? 'json ✓' : 'no header'}
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