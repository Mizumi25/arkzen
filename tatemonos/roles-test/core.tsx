/* @arkzen:meta
name: roles-test
version: 1.0.0
description: Tests role-based access control. Two roles (admin, user), protected routes, role-gated UI sections.
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

/* @arkzen:api:role_audit_logs
model: RoleAuditLog
controller: RoleAuditLogController
prefix: /api/roles-test
middleware: []
endpoints:
  index:
    method: GET
    route: /logs
    description: Get audit logs
    response:
      type: collection
  me:
    method: GET
    route: /me
    description: Get simulated current user (stored in session)
    type: role_me
    response:
      type: single
  adminOnly:
    method: GET
    route: /admin-only
    description: Admin-only route test — checks session role
    type: role_admin_only
    response:
      type: single
  userOnly:
    method: GET
    route: /user-only
    description: Any user route test — always passes
    type: role_user_only
    response:
      type: single
  promote:
    method: POST
    route: /promote
    description: Promote simulated user to admin role
    type: role_promote
    response:
      type: message
      value: Promoted to admin
  demote:
    method: POST
    route: /demote
    description: Demote simulated user to user role
    type: role_demote
    response:
      type: message
      value: Demoted to user
*/

/* @arkzen:components:shared */

'use client'

import React, { useState, useEffect } from 'react'
import { arkzenFetch } from '@/arkzen/core/stores/authStore'

/* @arkzen:components:shared:end */



/* @arkzen:page:dashboard */
/* @arkzen:page:layout:guest */
const DashboardPage = () => {
  type SimUser = { name: string; email: string; role: string }
  type TestResult = { status: 'idle' | 'pass' | 'fail'; message: string }

  const [simUser,      setSimUser]      = useState<SimUser | null>(null)
  const [adminResult,  setAdminResult]  = useState<TestResult>({ status: 'idle', message: '' })
  const [userResult,   setUserResult]   = useState<TestResult>({ status: 'idle', message: '' })
  const [logs,         setLogs]         = useState<any[]>([])
  const [promoting,    setPromoting]    = useState(false)

  const currentRole = simUser?.role ?? 'guest'

  const loadMe = async () => {
    try {
      const res = await arkzenFetch('/api/roles-test/me')
      const d   = await res.json()
      setSimUser(d.user ?? null)
    } catch {}
  }

  const loadLogs = async () => {
    try {
      const res = await arkzenFetch('/api/roles-test/logs')
      const d   = await res.json()
      setLogs(d.data ?? [])
    } catch {}
  }

  useEffect(() => { loadMe(); loadLogs() }, [])

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
      await loadMe()
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
          
        </div>

        {/* Current role card */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5 flex items-center justify-between">
          <div>
            <div className="text-sm text-neutral-500">Logged in as</div>
            <div className="font-semibold">{simUser?.name ?? 'Test User'} · {simUser?.email ?? 'test@arkzen.dev'}</div>
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
                <code className="text-xs text-neutral-400">GET /api/roles-test/user-only · middleware: []</code>
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