/* @arkzen:meta
name: mail-test
version: 1.0.0
description: Tests Laravel Mailable system. Send real emails via SMTP/Mailtrap. Tests subject, body fields, queue delivery.
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

/* @arkzen:database:mail_logs
columns:
  user_id:
    type: integer
    nullable: true
  to_email: string
  subject: string
  mail_class: string
  status: string
  error: text
timestamps: true
*/

/* @arkzen:api
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
    validation:
      mail: required|string
      to: required|email
      data: array
    response:
      type: single
*/

/* @arkzen:mail
welcome-mail:
  subject: "Welcome to Arkzen"
  data:
    username: string
    app_name: string
order-confirmation:
  subject: "Your order has been confirmed"
  data:
    order_id: string
    total: string
    customer_name: string
password-reset:
  subject: "Reset your password"
  data:
    reset_link: string
    expires_in: string
*/

/* @arkzen:components:shared */

'use client'

import React, { useState, useEffect } from 'react'
import { useAuthStore, setActiveTatemono, arkzenFetch } from '@/arkzen/core/stores/authStore'

if (typeof window !== 'undefined') {
  setActiveTatemono('mail-test')
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
          <h1 className="text-xl font-bold">✉️ Mail Test</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Sign in to test email sending
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
          <a href="/mail-test/register" className="text-neutral-700 underline underline-offset-2">
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
          <h1 className="text-xl font-bold">✉️ Mail Test</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Create an account to test email sending
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
          <a href="/mail-test/login" className="text-neutral-700 underline underline-offset-2">
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
  const { user } = useAuthStore()

  const mailTypes = [
    {
      key: 'welcome-mail',
      label: 'Welcome Mail',
      desc: 'Sends WelcomeMail to the address below',
      fields: { username: user?.name || 'User', app_name: 'Arkzen' },
      color: 'bg-blue-500',
    },
    {
      key: 'order-confirmation',
      label: 'Order Confirmation',
      desc: 'Sends OrderConfirmationMail with order details',
      fields: { order_id: 'ORD-1234', total: '$99.00', customer_name: user?.name || 'Customer' },
      color: 'bg-green-500',
    },
    {
      key: 'password-reset',
      label: 'Password Reset',
      desc: 'Sends PasswordResetMail with a fake reset link',
      fields: { reset_link: 'https://example.com/reset/fake-token', expires_in: '60 minutes' },
      color: 'bg-orange-500',
    },
  ]

  const [toEmail, setToEmail]   = useState(user?.email ?? '')
  const [sending, setSending]   = useState<string | null>(null)
  const [logs, setLogs]         = useState<any[]>([])
  const [result, setResult]     = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const loadLogs = async () => {
    try {
      const res = await arkzenFetch('/api/mail-test/logs')
      const d   = await res.json()
      setLogs(d.data ?? [])
    } catch {}
  }

  useEffect(() => { loadLogs() }, [])

  const send = async (mailKey: string, fields: Record<string, string>) => {
    setSending(mailKey)
    setResult(null)
    try {
      const res = await arkzenFetch('/api/mail-test/send', {
        method: 'POST',
        body: JSON.stringify({ mail: mailKey, to: toEmail, data: fields }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.message ?? 'Failed to send')
      setResult({ type: 'success', msg: `✓ ${d.message ?? 'Mail queued successfully'}` })
      setTimeout(loadLogs, 1000)
    } catch (e) {
      setResult({ type: 'error', msg: e instanceof Error ? e.message : 'Send failed' })
    } finally {
      setSending(null)
    }
  }

  const statusBadge = (s: string) => s === 'sent'
    ? 'bg-green-100 text-green-700'
    : s === 'failed'
    ? 'bg-red-100 text-red-700'
    : 'bg-yellow-100 text-yellow-700'

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">✉️ Mail Test</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Signed in as <span className="font-medium">{user?.email}</span>
            </p>
            <p className="text-xs text-neutral-400 mt-0.5">
              Configure <code>MAIL_*</code> in .env. Use Mailtrap for local testing.
            </p>
          </div>
          <a href="/mail-test/logout" className="text-xs text-neutral-400 hover:text-neutral-700">
            Sign out
          </a>
        </div>

        {/* To address */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5">
          <label className="text-sm font-medium text-neutral-700 block mb-2">Send to address</label>
          <input
            className="arkzen-input w-full"
            type="email"
            value={toEmail}
            onChange={e => setToEmail(e.target.value)}
            placeholder="recipient@example.com"
          />
        </div>

        {/* Result banner */}
        {result && (
          <div className={`p-4 rounded-2xl text-sm ${result.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {result.msg}
          </div>
        )}

        {/* Mail types */}
        <div className="space-y-3">
          {mailTypes.map(m => (
            <div key={m.key} className="bg-white rounded-2xl border border-neutral-100 p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${m.color}`} />
                <div>
                  <div className="font-medium text-sm">{m.label}</div>
                  <div className="text-xs text-neutral-500">{m.desc}</div>
                  <div className="text-xs text-neutral-400 mt-1">
                    Fields: {Object.entries(m.fields).map(([k, v]) => `${k}="${v}"`).join(', ')}
                  </div>
                </div>
              </div>
              <button
                className="arkzen-btn text-sm shrink-0"
                onClick={() => send(m.key, m.fields)}
                disabled={!!sending || !toEmail}
              >
                {sending === m.key ? 'Sending...' : 'Send'}
              </button>
            </div>
          ))}
        </div>

        {/* Logs */}
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="font-semibold">Send log</h2>
            <button className="text-xs text-neutral-400 hover:text-neutral-700" onClick={loadLogs}>Refresh</button>
          </div>
          {logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-400">No mails sent yet.</div>
          ) : (
            <div className="divide-y divide-neutral-50">
              {logs.map((l, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">{l.mail_class}</span>
                    <p className="text-xs text-neutral-500">To: {l.to_email} · {l.subject}</p>
                    {l.error && <p className="text-xs text-red-500 mt-0.5">{l.error}</p>}
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusBadge(l.status)}`}>{l.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-neutral-400 bg-neutral-50 rounded-xl p-4">
          <strong>Setup:</strong> Set <code>MAIL_MAILER=smtp</code> and Mailtrap credentials in <code>.env</code>.
          Run <code>php artisan queue:work</code> if using queued mail.
        </div>
      </div>
    </div>
  )
}
/* @arkzen:page:dashboard:end */