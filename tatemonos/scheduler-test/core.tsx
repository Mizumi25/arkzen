/* @arkzen:meta
name: scheduler-test
version: 1.0.0
description: Tests Laravel Console Commands + Scheduler. Register Artisan commands, see them run on schedule, inspect the execution history.
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

/* @arkzen:database:command_runs
columns:
  command_name: string
  signature: string
  exit_code: integer
  output: text
  triggered_by: string
  duration_ms: integer
timestamps: true
*/

/* @arkzen:api
middleware: [auth]
routes:
  - GET  /scheduler-test/runs           → index
  - POST /scheduler-test/run            → store
  - POST /scheduler-test/runs/clear     → clearRuns
*/

/* @arkzen:console
cleanup-temp:
  signature: scheduler-test:cleanup-temp
  description: Deletes temporary files older than 24h
  schedule: "0 * * * *"
generate-report:
  signature: scheduler-test:generate-report
  description: Generates a daily activity report
  schedule: "0 8 * * *"
ping-health:
  signature: scheduler-test:ping-health
  description: Pings all services and records health status
  schedule: "*/5 * * * *"
sync-data:
  signature: scheduler-test:sync-data
  description: Syncs data from external source
  schedule: "*/15 * * * *"
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
        <h1 className="text-xl font-semibold mb-6">Scheduler Test — Login</h1>
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

  const commands = [
    { key: 'cleanup-temp',     label: 'Cleanup Temp',    signature: 'scheduler-test:cleanup-temp',    schedule: 'Every hour',     icon: '🧹' },
    { key: 'generate-report',  label: 'Generate Report', signature: 'scheduler-test:generate-report', schedule: 'Daily at 8am',   icon: '📊' },
    { key: 'ping-health',      label: 'Ping Health',     signature: 'scheduler-test:ping-health',     schedule: 'Every 5 min',    icon: '💓' },
    { key: 'sync-data',        label: 'Sync Data',       signature: 'scheduler-test:sync-data',       schedule: 'Every 15 min',   icon: '🔄' },
  ]

  const [runs, setRuns]         = useState<any[]>([])
  const [running, setRunning]   = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)

  const loadRuns = async () => {
    try {
      const res = await arkzenFetch('/api/scheduler-test/runs')
      const d   = await res.json()
      setRuns(d.data ?? [])
    } catch {}
  }

  useEffect(() => {
    loadRuns()
    const interval = setInterval(loadRuns, 10000)
    return () => clearInterval(interval)
  }, [])

  const runCommand = async (key: string) => {
    setRunning(key)
    try {
      await arkzenFetch('/api/scheduler-test/run', {
        method: 'POST',
        body: JSON.stringify({ command: key, triggered_by: 'manual' }),
      })
      setTimeout(loadRuns, 800)
    } catch {} finally {
      setRunning(null)
    }
  }

  const clearRuns = async () => {
    setClearing(true)
    try {
      await arkzenFetch('/api/scheduler-test/runs/clear', { method: 'POST' })
      setRuns([])
    } catch {} finally {
      setClearing(false)
    }
  }

  const exitCodeBadge = (code: number) => code === 0
    ? 'bg-green-100 text-green-700'
    : 'bg-red-100 text-red-700'

  const triggeredBadge = (t: string) => t === 'manual'
    ? 'bg-blue-100 text-blue-600'
    : 'bg-neutral-100 text-neutral-500'

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">⏰ Scheduler Test</h1>
            <p className="text-sm text-neutral-500 mt-1">Run commands manually or let the scheduler fire them.</p>
          </div>
          <button className="arkzen-btn-ghost text-sm" onClick={logout}>Logout ({user?.name})</button>
        </div>

        {/* Commands */}
        <div className="grid grid-cols-2 gap-3">
          {commands.map(cmd => (
            <div key={cmd.key} className="bg-white rounded-2xl border border-neutral-100 p-4">
              <div className="flex items-center gap-2 mb-1">
                <span>{cmd.icon}</span>
                <span className="font-medium text-sm">{cmd.label}</span>
              </div>
              <code className="text-xs text-neutral-400 block mb-1">{cmd.signature}</code>
              <div className="text-xs text-neutral-500 mb-3">🕐 {cmd.schedule}</div>
              <button
                className="arkzen-btn w-full text-sm"
                onClick={() => runCommand(cmd.key)}
                disabled={!!running}
              >
                {running === cmd.key ? 'Running...' : 'Run now'}
              </button>
            </div>
          ))}
        </div>

        {/* Execution history */}
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="font-semibold">Execution history</h2>
            <div className="flex gap-3">
              <button className="text-xs text-neutral-400" onClick={loadRuns}>Refresh</button>
              {runs.length > 0 && (
                <button className="text-xs text-red-400" onClick={clearRuns} disabled={clearing}>
                  {clearing ? '...' : 'Clear'}
                </button>
              )}
            </div>
          </div>

          {runs.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-400">
              No runs yet. Click "Run now" on any command above.
            </div>
          ) : (
            <div className="divide-y divide-neutral-50">
              {runs.map((r, i) => (
                <div key={i} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-medium text-neutral-700">{r.signature}</code>
                      <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${triggeredBadge(r.triggered_by)}`}>
                        {r.triggered_by}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.duration_ms && <span className="text-xs text-neutral-400">{r.duration_ms}ms</span>}
                      <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${exitCodeBadge(r.exit_code)}`}>
                        exit {r.exit_code}
                      </span>
                    </div>
                  </div>
                  {r.output && (
                    <pre className="text-xs text-neutral-400 bg-neutral-50 rounded-lg p-2 mt-1 overflow-x-auto whitespace-pre-wrap">{r.output}</pre>
                  )}
                  <div className="text-xs text-neutral-300 mt-1">{r.created_at}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-neutral-400 bg-neutral-50 rounded-xl p-4">
          <strong>Setup:</strong> Add to your crontab: <code>* * * * * php /path/to/artisan schedule:run</code><br/>
          <strong>Commands are scoped:</strong> All signatures are prefixed with <code>scheduler-test:</code> (auto-scoped by ConsoleBuilder) so they never collide with other tatemonos.<br/>
          <strong>Run all now:</strong> <code>php artisan schedule:run</code>
        </div>
      </div>
    </div>
  )
}
/* @arkzen:page:dashboard:end */
