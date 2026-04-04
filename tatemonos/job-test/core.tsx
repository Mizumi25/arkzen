/* @arkzen:meta
name: job-test
version: 1.0.0
description: Tests Laravel Queue Jobs. Dispatch a job, watch it process, see the result. Tests sync, default, and failed queues.
auth: true
*/

/* @arkzen:database:job_results
columns:
  job_name: string
  status: string
  result: text
  processed_at: timestamp
timestamps: true
*/

/* @arkzen:api
middleware: [auth]
routes:
  - GET  /job-test/results         → index
  - POST /job-test/dispatch        → store
  - GET  /job-test/failed          → failed
*/

/* @arkzen:jobs
process-data:
  queue: default
  tries: 3
  timeout: 30
heavy-computation:
  queue: heavy
  tries: 1
  timeout: 120
always-fails:
  queue: default
  tries: 2
  timeout: 10
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
        <h1 className="text-xl font-semibold mb-6">Job Test — Login</h1>
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
  const [results, setResults]   = useState<any[]>([])
  const [loading, setLoading]   = useState(false)
  const [dispatching, setDispatching] = useState<string | null>(null)

  const jobs = [
    { name: 'process-data',       label: 'Process Data',       desc: 'Normal job, succeeds in ~2s', queue: 'default', color: 'bg-blue-500' },
    { name: 'heavy-computation',  label: 'Heavy Computation',  desc: 'Slow job, 5s timeout simulation', queue: 'heavy', color: 'bg-purple-500' },
    { name: 'always-fails',       label: 'Always Fails',       desc: 'Tests the failed jobs handler', queue: 'default', color: 'bg-red-500' },
  ]

  const loadResults = async () => {
    setLoading(true)
    try {
      const res = await arkzenFetch('/api/job-test/results')
      const d   = await res.json()
      setResults(d.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadResults() }, [])

  const dispatch = async (jobName: string) => {
    setDispatching(jobName)
    try {
      await arkzenFetch('/api/job-test/dispatch', {
        method: 'POST',
        body: JSON.stringify({ job: jobName })
      })
      setTimeout(loadResults, 1500)
    } catch (e) {
      console.error(e)
    } finally {
      setDispatching(null)
    }
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      completed: 'bg-green-100 text-green-700',
      processing: 'bg-yellow-100 text-yellow-700',
      failed: 'bg-red-100 text-red-700',
    }
    return map[status] ?? 'bg-neutral-100 text-neutral-600'
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">⚙️ Job Test</h1>
            <p className="text-sm text-neutral-500 mt-1">Queue: <code>php artisan queue:work</code></p>
          </div>
          <button className="arkzen-btn-ghost text-sm" onClick={logout}>Logout ({user?.name})</button>
        </div>

        {/* Dispatch buttons */}
        <div className="grid gap-3">
          {jobs.map(job => (
            <div key={job.name} className="bg-white rounded-2xl border border-neutral-100 p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${job.color}`} />
                <div>
                  <div className="font-medium text-sm">{job.label}</div>
                  <div className="text-xs text-neutral-500">{job.desc} · queue: {job.queue}</div>
                </div>
              </div>
              <button
                className="arkzen-btn text-sm"
                onClick={() => dispatch(job.name)}
                disabled={dispatching === job.name}
              >
                {dispatching === job.name ? 'Dispatching...' : 'Dispatch'}
              </button>
            </div>
          ))}
        </div>

        {/* Results */}
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="font-semibold">Results</h2>
            <button className="text-xs text-neutral-400 hover:text-neutral-700" onClick={loadResults}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          {results.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-400">No jobs dispatched yet.</div>
          ) : (
            <div className="divide-y divide-neutral-50">
              {results.map((r, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">{r.job_name}</span>
                    <p className="text-xs text-neutral-500">{r.result}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusBadge(r.status)}`}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-neutral-400 bg-neutral-50 rounded-xl p-4">
          <strong>How to test:</strong> Run <code>php artisan queue:work</code> in a terminal, then dispatch jobs here. Results update after ~2s. The "Always Fails" job will appear in the failed_jobs table.
        </div>
      </div>
    </div>
  )
}
/* @arkzen:page:dashboard:end */
