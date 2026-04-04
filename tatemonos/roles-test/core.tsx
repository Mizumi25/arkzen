/* @arkzen:meta
name: roles-test
version: 1.0.0
description: Tests role-based access control. Two roles (admin, user), protected routes, role-gated UI sections.
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

/* @arkzen:database:role_audit_logs
columns:
  user_id: integer
  action: string
  role_required: string
  granted: boolean
timestamps: true
*/

/* @arkzen:api
middleware: [auth]
routes:
  - GET  /roles-test/me              → me
  - GET  /roles-test/admin-only      → adminOnly
  - GET  /roles-test/user-only       → userOnly
  - GET  /roles-test/logs            → index
  - POST /roles-test/promote         → promote
  - POST /roles-test/demote          → demote
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
        <h1 className="text-xl font-semibold mb-6">Roles Test — Login</h1>
        <p className="text-xs text-neutral-400 mb-4">Use any account. Role starts as <strong>user</strong>. You can promote to <strong>admin</strong> from the dashboard.</p>
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
  const { user, logout, fetchMe } = useAuthStore()

  type TestResult = { status: 'idle' | 'pass' | 'fail'; message: string }
  const [adminResult, setAdminResult] = useState<TestResult>({ status: 'idle', message: '' })
  const [userResult,  setUserResult]  = useState<TestResult>({ status: 'idle', message: '' })
  const [logs, setLogs]               = useState<any[]>([])
  const [promoting, setPromoting]     = useState(false)

  const currentRole = (user as any)?.role ?? 'user'

  const loadLogs = async () => {
    try {
      const res = await arkzenFetch('/api/roles-test/logs')
      const d   = await res.json()
      setLogs(d.data ?? [])
    } catch {}
  }

  useEffect(() => { loadLogs() }, [])

  const testRoute = async (
    route: string,
    setter: React.Dispatch<React.SetStateAction<TestResult>>
  ) => {
    setter({ status: 'idle', message: 'Testing...' })
    try {
      const res = await arkzenFetch(route)
      const d   = await res.json()
      if (res.ok) {
        setter({ status: 'pass', message: d.message ?? '✓ Access granted' })
      } else {
        setter({ status: 'fail', message: d.message ?? '✗ Access denied' })
      }
      setTimeout(loadLogs, 500)
    } catch (e) {
      setter({ status: 'fail', message: e instanceof Error ? e.message : 'Request failed' })
    }
  }

  const promoteOrDemote = async (action: 'promote' | 'demote') => {
    setPromoting(true)
    try {
      await arkzenFetch(`/api/roles-test/${action}`, { method: 'POST' })
      await fetchMe() // re-hydrate user with new role
    } catch {} finally {
      setPromoting(false)
    }
  }

  const resultStyle = (s: TestResult['status']) =>
    s === 'pass' ? 'bg-green-50 border-green-200 text-green-700' :
    s === 'fail' ? 'bg-red-50 border-red-200 text-red-700' :
    'bg-neutral-50 border-neutral-200 text-neutral-500'

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">🛡️ Roles Test</h1>
          <button className="arkzen-btn-ghost text-sm" onClick={logout}>Logout ({user?.name})</button>
        </div>

        {/* Current role card */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5 flex items-center justify-between">
          <div>
            <div className="text-sm text-neutral-500">Logged in as</div>
            <div className="font-semibold">{user?.name} · {user?.email}</div>
            <div className="mt-1">
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${currentRole === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                {currentRole}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {currentRole !== 'admin' && (
              <button className="arkzen-btn text-sm" onClick={() => promoteOrDemote('promote')} disabled={promoting}>
                {promoting ? '...' : 'Promote to admin'}
              </button>
            )}
            {currentRole === 'admin' && (
              <button className="arkzen-btn-ghost text-sm" onClick={() => promoteOrDemote('demote')} disabled={promoting}>
                {promoting ? '...' : 'Demote to user'}
              </button>
            )}
          </div>
        </div>

        {/* Route tests */}
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-neutral-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-medium text-sm">Admin-only route</div>
                <code className="text-xs text-neutral-400">GET /api/roles-test/admin-only · middleware: [auth, role:admin]</code>
              </div>
              <button className="arkzen-btn text-sm" onClick={() => testRoute('/api/roles-test/admin-only', setAdminResult)}>
                Test
              </button>
            </div>
            {adminResult.message && (
              <div className={`p-3 rounded-xl border text-sm ${resultStyle(adminResult.status)}`}>
                {adminResult.message}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-neutral-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-medium text-sm">User route (any authenticated)</div>
                <code className="text-xs text-neutral-400">GET /api/roles-test/user-only · middleware: [auth]</code>
              </div>
              <button className="arkzen-btn text-sm" onClick={() => testRoute('/api/roles-test/user-only', setUserResult)}>
                Test
              </button>
            </div>
            {userResult.message && (
              <div className={`p-3 rounded-xl border text-sm ${resultStyle(userResult.status)}`}>
                {userResult.message}
              </div>
            )}
          </div>
        </div>

        {/* Audit log */}
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="font-semibold">Access audit log</h2>
            <button className="text-xs text-neutral-400" onClick={loadLogs}>Refresh</button>
          </div>
          {logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-400">No access attempts yet.</div>
          ) : (
            <div className="divide-y divide-neutral-50">
              {logs.map((l, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">{l.action}</span>
                    <p className="text-xs text-neutral-500">Requires: {l.role_required}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${l.granted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {l.granted ? 'granted' : 'denied'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-neutral-400 bg-neutral-50 rounded-xl p-4">
          <strong>How it works:</strong> The <code>role:admin</code> middleware is generated by MiddlewareBuilder (CheckRole.php). It reads <code>$user→role</code> from the users table. Promote/Demote buttons call the backend to update the role column, then re-fetches your user profile.
        </div>
      </div>
    </div>
  )
}
/* @arkzen:page:dashboard:end */
