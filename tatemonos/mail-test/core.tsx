/* @arkzen:meta
name: mail-test
version: 2.0.0
description: Tests Laravel Mail system. Send emails via SMTP/Mailtrap. Logs attempts. Updated to v6 named mail format.
auth: true
*/

/* @arkzen:config
toast:
  position: top-right
  duration: 3000
layout:
  guest:
    className: "min-h-screen bg-neutral-50"
  auth:
    className: "min-h-screen bg-neutral-50"
*/

/* @arkzen:database:mail_logs
table: mail_logs
timestamps: true
columns:
  id:
    type: integer
    primary: true
    autoIncrement: true
  user_id:
    type: integer
    nullable: true
  to_email:
    type: string
  subject:
    type: string
  mail_class:
    type: string
  status:
    type: string
    default: sent
  error:
    type: text
    nullable: true
*/

/* @arkzen:api:mail_logs
model: MailLog
controller: MailLogController
prefix: /api/mail-test
middleware: [auth]
endpoints:
  index:
    method: GET
    route: /logs
    description: Get all mail logs
    response:
      type: collection
  store:
    method: POST
    route: /send
    description: Send an email
    type: mail_send
    validation:
      mail: required|string
      to: required|email
      data: array
    response:
      type: single
*/

/* @arkzen:mail:welcome-mail
subject: "Welcome to Arkzen"
data:
  username: string
  app_name: string
*/
/* @arkzen:mail:welcome-mail:end */

/* @arkzen:mail:order-confirmation
subject: "Your order has been confirmed"
data:
  order_id: string
  total: string
  customer_name: string
*/
/* @arkzen:mail:order-confirmation:end */

/* @arkzen:mail:password-reset
subject: "Reset your password"
data:
  reset_link: string
  expires_in: string
*/
/* @arkzen:mail:password-reset:end */

/* @arkzen:components:shared */

'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Send, RefreshCw, LogOut, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useAuthStore, setActiveTatemono, arkzenFetch } from '@/arkzen/core/stores/authStore'

if (typeof window !== 'undefined') {
  setActiveTatemono('mail-test')
}

interface MailLog {
  id:         number
  to_email:   string
  subject:    string
  mail_class: string
  status:     string
  error:      string | null
  created_at: string
}

interface MailType {
  key:    string
  label:  string
  desc:   string
  fields: Record<string, string>
}

/* @arkzen:components:shared:end */

/* @arkzen:page:login */
/* @arkzen:page:layout:guest */
const LoginPage = () => {
  const { login, isLoading } = useAuthStore()
  const [email, setEmail]     = useState('test@arkzen.local')
  const [password, setPassword] = useState('password')
  const [error, setError]     = useState<string | null>(null)

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
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-neutral-900 rounded-lg flex items-center justify-center">
            <Mail size={15} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-neutral-900">Mail Test</span>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">Sign in</h1>
            <p className="text-sm text-neutral-500 mt-0.5">to start testing email delivery</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
              <XCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-2.5">
            <input
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-colors"
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            <input
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-colors"
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <button
            className="w-full bg-neutral-900 text-white text-sm font-medium py-2 rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition-colors"
            onClick={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>

          <p className="text-xs text-center text-neutral-400">
            No account?{' '}
            <a href="/mail-test/register" className="text-neutral-600 underline underline-offset-2">
              Register
            </a>
          </p>
        </div>

        <p className="text-xs text-center text-neutral-400 mt-4">
          Default: test@arkzen.local / password
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
  const [name, setName]         = useState('Test User')
  const [email, setEmail]       = useState('test@arkzen.local')
  const [password, setPassword] = useState('password')
  const [confirm, setConfirm]   = useState('password')
  const [error, setError]       = useState<string | null>(null)

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
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-neutral-900 rounded-lg flex items-center justify-center">
            <Mail size={15} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-neutral-900">Mail Test</span>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">Create account</h1>
            <p className="text-sm text-neutral-500 mt-0.5">to start testing email delivery</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
              <XCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-2.5">
            <input
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-colors"
              placeholder="Name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <input
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-colors"
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <input
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-colors"
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <input
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-colors"
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />
          </div>

          <button
            className="w-full bg-neutral-900 text-white text-sm font-medium py-2 rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition-colors"
            onClick={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>

          <p className="text-xs text-center text-neutral-400">
            Already have an account?{' '}
            <a href="/mail-test/login" className="text-neutral-600 underline underline-offset-2">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
/* @arkzen:page:register:end */

/* @arkzen:page:dashboard */
/* @arkzen:page:layout:auth */
const DashboardPage = () => {
  const router          = useRouter()
  const { user, logout } = useAuthStore()

  const mailTypes: MailType[] = [
    {
      key:    'welcome-mail',
      label:  'Welcome Mail',
      desc:   'Onboarding email with username and app name',
      fields: { username: user?.name ?? 'User', app_name: 'Arkzen' },
    },
    {
      key:    'order-confirmation',
      label:  'Order Confirmation',
      desc:   'Transactional receipt with order details',
      fields: { order_id: 'ORD-1234', total: '$99.00', customer_name: user?.name ?? 'Customer' },
    },
    {
      key:    'password-reset',
      label:  'Password Reset',
      desc:   'Security email with reset link and expiry',
      fields: { reset_link: 'https://example.com/reset/fake-token', expires_in: '60 minutes' },
    },
  ]

  const [toEmail, setToEmail]   = useState(user?.email ?? '')
  const [sending, setSending]   = useState<string | null>(null)
  const [logs, setLogs]         = useState<MailLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [toast, setToast]       = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  const loadLogs = async () => {
    setLoadingLogs(true)
    try {
      const res = await arkzenFetch('/api/mail-test/logs')
      const d   = await res.json()
      setLogs(d.data ?? [])
    } catch {}
    finally { setLoadingLogs(false) }
  }

  useEffect(() => { loadLogs() }, [])

  const send = async (mailKey: string, fields: Record<string, string>) => {
    if (!toEmail) { showToast('error', 'Enter a recipient email first'); return }
    setSending(mailKey)
    try {
      const res = await arkzenFetch('/api/mail-test/send', {
        method: 'POST',
        body:   JSON.stringify({ mail: mailKey, to: toEmail, data: fields }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.message ?? 'Failed to send')
      showToast('success', 'Mail queued — check your inbox')
      setTimeout(loadLogs, 1200)
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Send failed')
    } finally {
      setSending(null)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.replace('/mail-test/login')
  }

  const formatTime = (ts: string) => {
    try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    catch { return ts }
  }

  return (
    <div className="arkzen-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-neutral-900 rounded-xl flex items-center justify-center">
            <Mail size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">Mail Test</h1>
            <p className="text-xs text-neutral-500">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
        >
          <LogOut size={13} /> Sign out
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.type === 'success'
            ? 'bg-white border border-emerald-200 text-emerald-700'
            : 'bg-white border border-red-200 text-red-600'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle size={15} className="text-emerald-500" />
            : <XCircle size={15} className="text-red-500" />
          }
          {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left — Send Panel */}
        <div className="space-y-4">
          {/* Recipient */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide block mb-2">
              Recipient
            </label>
            <input
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-colors"
              type="email"
              placeholder="recipient@example.com"
              value={toEmail}
              onChange={e => setToEmail(e.target.value)}
            />
            <p className="text-xs text-neutral-400 mt-2">
              Use Mailtrap or a real address. Configure <code className="bg-neutral-100 px-1 rounded">MAIL_*</code> in <code className="bg-neutral-100 px-1 rounded">.env</code>
            </p>
          </div>

          {/* Mail Types */}
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100">
              <h2 className="text-sm font-semibold text-neutral-900">Mailables</h2>
              <p className="text-xs text-neutral-400 mt-0.5">3 templates registered via @arkzen:mail</p>
            </div>
            <div className="divide-y divide-neutral-50">
              {mailTypes.map(m => (
                <div key={m.key} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-800">{m.label}</p>
                    <p className="text-xs text-neutral-400 mt-0.5 truncate">{m.desc}</p>
                    <p className="text-xs font-mono text-neutral-300 mt-1">{m.key}</p>
                  </div>
                  <button
                    onClick={() => send(m.key, m.fields)}
                    disabled={!!sending || !toEmail}
                    className="shrink-0 flex items-center gap-1.5 bg-neutral-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-neutral-800 disabled:opacity-40 transition-colors"
                  >
                    {sending === m.key
                      ? <><span className="animate-pulse">Sending</span></>
                      : <><Send size={11} /> Send</>
                    }
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Log Panel */}
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">Send log</h2>
              <p className="text-xs text-neutral-400 mt-0.5">{logs.length} entries</p>
            </div>
            <button
              onClick={loadLogs}
              disabled={loadingLogs}
              className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              <RefreshCw size={13} className={loadingLogs ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Mail size={28} className="text-neutral-200 mb-3" />
                <p className="text-sm text-neutral-400">No mail sent yet</p>
                <p className="text-xs text-neutral-300 mt-1">Send a mail on the left to see logs here</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-50">
                {logs.map((l) => (
                  <div key={l.id} className="px-5 py-3.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-neutral-800 truncate">{l.mail_class}</p>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5 truncate">
                        To: {l.to_email}
                      </p>
                      {l.error && (
                        <p className="text-xs text-red-500 mt-0.5 truncate">{l.error}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        l.status === 'sent'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-red-50 text-red-500'
                      }`}>
                        {l.status}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-neutral-300">
                        <Clock size={10} />
                        {formatTime(l.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
/* @arkzen:page:dashboard:end */