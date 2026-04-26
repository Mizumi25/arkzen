/* @arkzen:meta
name: roles-test
version: 2.1.0
description: "Tests role-based access control with real Sanctum auth. Two roles (admin, user), protected routes, role-gated UI. v2.1: middleware now declares [auth, role:admin] at the DSL level to exercise MiddlewareBuilder v6.0 scoped CheckRole generation."
auth: true
auth_seed:
  users:
    - name: Admin User
      email: admin@roles-test.com
      password: password123
      role: admin
    - name: Regular User
      email: user@roles-test.com
      password: password123
      role: user
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
table: role_audit_logs
columns:
  user_id:
    type: integer
    nullable: true
  action:
    type: string
  role_required:
    type: string
  granted:
    type: boolean
timestamps: true
*/

/*
  NOTE: No @arkzen:database:users block needed.
  auth:true delegates the users table entirely to AuthBuilder (Phase 6.5).
  As of AuthBuilder v2.1, the users table always includes a `role` column
  (varchar 20, default 'user') — both on CREATE and as an idempotent ALTER
  for any pre-existing tables. The User model also has 'role' in $fillable.
  The promote/demote endpoints update this column directly via $user->update().
*/

/* @arkzen:api:role_audit_logs
model: RoleAuditLog
controller: RoleAuditLogController
prefix: /api/roles-test
middleware: [auth, role:admin]
endpoints:
  index:
    method: GET
    route: /logs
    description: Audit log of all access attempts
    response:
      type: collection
  adminOnly:
    method: GET
    route: /admin-only
    description: Admin-only route — role check performed in controller body ($user->role === 'admin'). Per-endpoint middleware override is not yet supported by RouteRegistrar; the check lives in the generated method.
    type: role_admin_only
    response:
      type: single
  userOnly:
    method: GET
    route: /user-only
    description: Any authenticated user — no role gate
    type: role_user_only
    response:
      type: single
  promote:
    method: POST
    route: /promote
    description: Promote the authenticated user to admin role
    type: role_promote
    response:
      type: message
      value: Promoted to admin
  demote:
    method: POST
    route: /demote
    description: Demote the authenticated user back to user role
    type: role_demote
    response:
      type: message
      value: Demoted to user
*/

/* @arkzen:components:shared */

'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield } from 'lucide-react'
import { useAuthStore, setActiveTatemono, arkzenFetch } from '@/arkzen/core/stores/authStore'

if (typeof window !== 'undefined') {
  setActiveTatemono('roles-test')
}

/* @arkzen:components:shared:end */



/* @arkzen:page:login */
/* @arkzen:page:layout:guest */
const LoginPage = () => {
  const { login, isLoading } = useAuthStore()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)

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
          <h1 className="text-xl font-bold flex items-center gap-2"><Shield size={18} /> Roles Test</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Sign in to test role-based access control
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
          <a href="/roles-test/register" className="text-neutral-700 underline underline-offset-2">
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
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState<string | null>(null)

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
          <h1 className="text-xl font-bold flex items-center gap-2"><Shield size={18} /> Roles Test</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Create an account — you'll start as{' '}
            <span className="font-medium text-blue-600">user</span>
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
          <a href="/roles-test/login" className="text-neutral-700 underline underline-offset-2">
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
  const { user, logout, refreshUser } = useAuthStore()

  type TestResult = { status: 'idle' | 'pass' | 'fail'; message: string }

  const [adminResult, setAdminResult] = useState<TestResult>({ status: 'idle', message: '' })
  const [userResult,  setUserResult]  = useState<TestResult>({ status: 'idle', message: '' })
  const [logs,        setLogs]        = useState<any[]>([])
  const [promoting,   setPromoting]   = useState(false)

  const currentRole = user?.role ?? 'user'

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
      setTimeout(loadLogs, 400)
    } catch (e) {
      setter({ status: 'fail', message: e instanceof Error ? e.message : 'Request failed' })
    }
  }

  const promoteOrDemote = async (action: 'promote' | 'demote') => {
    setPromoting(true)
    try {
      await arkzenFetch(`/api/roles-test/${action}`, { method: 'POST' })
      await refreshUser()
    } catch {} finally {
      setPromoting(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.refresh()
    router.replace('/roles-test/login')
  }

  const resultStyle = (s: TestResult['status']) =>
    s === 'pass' ? 'bg-green-50 border-green-200 text-green-700' :
    s === 'fail' ? 'bg-red-50 border-red-200 text-red-700' :
    'bg-neutral-50 border-neutral-200 text-neutral-500'

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield size={20} /> Roles Test</h1>
          <button
            className="text-xs text-neutral-400 hover:text-neutral-700"
            onClick={handleLogout}
          >
            Sign out
          </button>
        </div>

        {/* Current user card */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5 flex items-center justify-between">
          <div>
            <div className="text-sm text-neutral-500">Signed in as</div>
            <div className="font-semibold">{user?.name} · {user?.email}</div>
            <div className="mt-1">
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                currentRole === 'admin'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {currentRole}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {currentRole !== 'admin' && (
              <button
                className="arkzen-btn text-sm"
                onClick={() => promoteOrDemote('promote')}
                disabled={promoting}
              >
                {promoting ? '...' : 'Promote to admin'}
              </button>
            )}
            {currentRole === 'admin' && (
              <button
                className="arkzen-btn-ghost text-sm"
                onClick={() => promoteOrDemote('demote')}
                disabled={promoting}
              >
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
                <code className="text-xs text-neutral-400">
                  GET /api/roles-test/admin-only · middleware: [auth, role:admin]
                </code>
              </div>
              <button
                className="arkzen-btn text-sm"
                onClick={() => testRoute('/api/roles-test/admin-only', setAdminResult)}
              >
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
                <code className="text-xs text-neutral-400">
                  GET /api/roles-test/user-only · middleware: [auth]
                </code>
              </div>
              <button
                className="arkzen-btn text-sm"
                onClick={() => testRoute('/api/roles-test/user-only', setUserResult)}
              >
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
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    l.granted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {l.granted ? 'granted' : 'denied'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="text-xs text-neutral-400 bg-neutral-50 rounded-xl p-4 space-y-1.5">
          <p>
            <strong>How it works:</strong> This Tatemono uses <code>auth: true</code> — Arkzen
            generates Sanctum routes scoped to <code>roles-test</code> (login, register, logout, me).
          </p>
          <p>
            The <code>role:admin</code> middleware (CheckRole.php) reads{' '}
            <code>$request→user()→role</code> from the Sanctum-authenticated user.
            Without real auth there is no <code>$request→user()</code> — every role check
            returns 401, which is why the v1 session-based approach was broken.
          </p>
          <p>
            Promote/Demote update the <code>role</code> column on the scoped users table,
            then call <code>refreshUser()</code> which re-fetches <code>/auth/me</code> so
            the store reflects the new role without a page reload.
          </p>
        </div>

      </div>
    </div>
  )
}
/* @arkzen:page:dashboard:end */
