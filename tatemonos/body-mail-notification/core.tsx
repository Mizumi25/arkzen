/* @arkzen:meta
name: body-mail-notification
version: 1.0.0
description: "Tests MailBuilder v3.1 blade_body injection and NotificationBuilder v3.9 toMail_body injection. Blade HTML is placed between the closing YAML comment and the end marker. This tatemono verifies that blade views are generated from injected HTML content and that toMail() uses the injected MailMessage chain instead of the stub."
auth: true
auth_seed:
  users:
    - name: Test User
      email: test@body-mail-notification.com
      password: password123
*/

/* @arkzen:config
toast:
  position: top-right
  duration: 4000
layout:
  guest:
    className: "min-h-screen bg-slate-50"
  auth:
    className: "min-h-screen bg-slate-50"
*/

/* @arkzen:database:send_log
table: send_log
timestamps: true
softDeletes: false
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
    nullable: true
  subject:
    type: string
    nullable: true
  mail_class:
    type: string
    nullable: true
  kind:
    type: string
    length: 20
    default: mail
  status:
    type: string
    length: 20
    default: sent
  error:
    type: text
    nullable: true
*/

/* @arkzen:api:send_log
model: SendLog
controller: SendLogController
prefix: /api/body-mail-notification
middleware: [auth]
endpoints:
  index:
    method: GET
    route: /log
    description: All send log entries for the authenticated user
    response:
      type: collection
  sendMail:
    method: POST
    route: /send-mail
    description: Send a mail and write a log row — blade_body injection test
    validation:
      mail: required|string|in:welcome,receipt,alert
      to: required|email
    response:
      type: single
  notify:
    method: POST
    route: /notify
    description: Trigger a notification and write a log row — toMail_body injection test
    validation:
      notification: required|string|in:action-required,summary
      message: sometimes|string|max:255
    response:
      type: single
  clearLog:
    method: DELETE
    route: /log/clear
    description: Wipe all send log entries for this user
    response:
      type: message
      value: Log cleared
*/

/* @arkzen:endpoint:sendMail
$validated = $request->validate([
    'mail' => 'required|string|in:welcome,receipt,alert',
    'to'   => 'required|email',
]);
$user      = $request->user('sanctum');
$mailKey   = $validated['mail'];
$className = \Illuminate\Support\Str::studly(str_replace('-', '_', $mailKey)) . 'Mail';
$fullClass = "\\App\\Mail\\Arkzen\\BodyMailNotification\\" . $className;
if (!class_exists($fullClass)) {
    return response()->json(['message' => 'Unknown mail type: ' . $mailKey], 422);
}
try {
    \Mail::to($validated['to'])->send(new $fullClass());
    $log = \App\Models\Arkzen\BodyMailNotification\SendLog::create([
        'user_id'    => $user?->id,
        'to_email'   => $validated['to'],
        'subject'    => $mailKey,
        'mail_class' => $fullClass,
        'kind'       => 'mail',
        'status'     => 'sent',
    ]);
    return response()->json($log, 201);
} catch (\Throwable $e) {
    $log = \App\Models\Arkzen\BodyMailNotification\SendLog::create([
        'user_id'    => $user?->id,
        'to_email'   => $validated['to'],
        'subject'    => $mailKey,
        'mail_class' => $fullClass,
        'kind'       => 'mail',
        'status'     => 'failed',
        'error'      => $e->getMessage(),
    ]);
    return response()->json($log, 201);
}
/* @arkzen:endpoint:sendMail:end */

/* @arkzen:endpoint:notify
$validated = $request->validate([
    'notification' => 'required|string|in:action-required,summary',
    'message'      => 'sometimes|string|max:255',
]);
$user     = $request->user();
$notifKey = $validated['notification'];
$className = \Illuminate\Support\Str::studly(str_replace('-', '_', $notifKey)) . 'Notification';
$fullClass = "\\App\\Notifications\\Arkzen\\BodyMailNotification\\" . $className;
if (!class_exists($fullClass)) {
    return response()->json(['message' => 'Unknown notification type: ' . $notifKey], 422);
}
try {
    $instance = new $fullClass($user);
    if (isset($validated['message'])) {
        $instance->message = $validated['message'];
    }
    $user->notify($instance);
    $log = \App\Models\Arkzen\BodyMailNotification\SendLog::create([
        'user_id'    => $user?->id,
        'to_email'   => $user?->email,
        'subject'    => $notifKey,
        'mail_class' => $fullClass,
        'kind'       => 'notification',
        'status'     => 'sent',
    ]);
    return response()->json($log, 201);
} catch (\Throwable $e) {
    $log = \App\Models\Arkzen\BodyMailNotification\SendLog::create([
        'user_id'    => $user?->id,
        'to_email'   => $user?->email,
        'subject'    => $notifKey,
        'mail_class' => $fullClass,
        'kind'       => 'notification',
        'status'     => 'failed',
        'error'      => $e->getMessage(),
    ]);
    return response()->json($log, 201);
}
/* @arkzen:endpoint:notify:end */

/* @arkzen:mail:welcome
subject: "Welcome to Arkzen — blade_body injection test"
data:
  name: string
  app_name: string
*/
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: sans-serif; background: #f8fafc; margin: 0; padding: 32px; }
    .card { background: #fff; border-radius: 12px; padding: 32px; max-width: 520px; margin: auto; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
    h1 { font-size: 22px; color: #1e293b; margin-bottom: 8px; }
    p { color: #475569; line-height: 1.6; }
    .badge { display: inline-block; background: #0f172a; color: #fff; border-radius: 6px; padding: 4px 12px; font-size: 12px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Welcome, {{ $name }}!</h1>
    <p>You are now part of <strong>{{ $app_name }}</strong>. This email was generated from a <code>blade_body</code> block injected via the Arkzen DSL — no manually created Blade file required.</p>
    <span class="badge">✓ blade_body injection works</span>
  </div>
</body>
</html>
/* @arkzen:mail:welcome:end */

/* @arkzen:mail:receipt
subject: "Your receipt — blade_body injection test"
data:
  order_id: string
  amount: string
  item_name: string
*/
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: sans-serif; background: #f0fdf4; margin: 0; padding: 32px; }
    .card { background: #fff; border-radius: 12px; padding: 32px; max-width: 520px; margin: auto; border: 1px solid #bbf7d0; }
    h1 { color: #15803d; font-size: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    td { padding: 8px 0; border-bottom: 1px solid #f0fdf4; color: #374151; }
    td:last-child { text-align: right; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🧾 Receipt #{{ $order_id }}</h1>
    <table>
      <tr><td>Item</td><td>{{ $item_name }}</td></tr>
      <tr><td>Amount</td><td>{{ $amount }}</td></tr>
      <tr><td>Status</td><td>✅ Paid</td></tr>
    </table>
    <p style="margin-top:16px;font-size:12px;color:#6b7280;">blade_body injected receipt — no stub used.</p>
  </div>
</body>
</html>
/* @arkzen:mail:receipt:end */

/* @arkzen:mail:alert
subject: "⚠ Action Required — blade_body injection test"
data:
  message: string
  action_url: string
*/
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: sans-serif; background: #fff7ed; margin: 0; padding: 32px; }
    .card { background: #fff; border-radius: 12px; padding: 32px; max-width: 520px; margin: auto; border-left: 4px solid #f97316; }
    h1 { color: #c2410c; font-size: 18px; }
    p { color: #374151; }
    a { display: inline-block; margin-top: 16px; background: #f97316; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <h1>⚠ Action Required</h1>
    <p>{{ $message }}</p>
    <a href="{{ $action_url }}">Take Action</a>
    <p style="margin-top:16px;font-size:12px;color:#9ca3af;">Injected via blade_body — MailBuilder v3.1 test.</p>
  </div>
</body>
</html>
/* @arkzen:mail:alert:end */

/* @arkzen:notifications:action-required
channels: [mail, database]
channel_type: private
message: "You have a pending action that requires your attention."
subject: "Action Required"
*/
return (new \Illuminate\Notifications\Messages\MailMessage)
    ->subject('⚠ Action Required — toMail_body injection test')
    ->greeting('Hello!')
    ->line($this->message ?? 'You have a pending action that requires your attention.')
    ->line('This toMail() body was injected via the Arkzen DSL — not a stub.')
    ->action('Review Now', url('/'))
    ->line('NotificationBuilder v3.9 toMail_body injection confirmed ✓');
/* @arkzen:notifications:action-required:end */

/* @arkzen:notifications:summary
channels: [mail, database]
channel_type: private
message: "Here is your activity summary."
subject: "Activity Summary"
*/
return (new \Illuminate\Notifications\Messages\MailMessage)
    ->subject('📊 Activity Summary — toMail_body injection test')
    ->greeting('Hi there!')
    ->line($this->message ?? 'Here is your latest activity summary.')
    ->line('Notifications: 2 unread | Mails: 3 sent | Status: All healthy')
    ->action('View Dashboard', url('/'))
    ->salutation('Cheers, Arkzen Engine');
/* @arkzen:notifications:summary:end */

/* @arkzen:components:shared */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, setActiveTatemono, arkzenFetch } from '@/arkzen/core/stores/authStore'

function useToast() {
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const show = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }, [])
  return {
    toast,
    success: (msg: string) => show('success', msg),
    error:   (msg: string) => show('error', msg),
  }
}

if (typeof window !== 'undefined') {
  setActiveTatemono('body-mail-notification')
}

type SendLogEntry = {
  id:         number
  kind:       'mail' | 'notification'
  subject:    string | null
  to_email:   string | null
  mail_class: string | null
  status:     'sent' | 'failed'
  error:      string | null
  created_at: string
}

const KindBadge = ({ kind }: { kind: string }) => (
  <span style={{
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    background: kind === 'mail' ? '#dbeafe' : '#fef9c3',
    color:      kind === 'mail' ? '#1d4ed8' : '#a16207',
    letterSpacing: 0.5,
  }}>
    {kind === 'mail' ? '✉ MAIL' : '🔔 NOTIF'}
  </span>
)

const StatusDot = ({ status }: { status: string }) => (
  <span style={{
    display: 'inline-block',
    width: 8, height: 8,
    borderRadius: '50%',
    background: status === 'sent' ? '#22c55e' : '#ef4444',
    marginRight: 6,
    verticalAlign: 'middle',
  }} />
)

/* @arkzen:components:shared:end */

/* @arkzen:page:login */
/* @arkzen:page:layout:guest */
const LoginPage = () => {
  const { login }  = useAuthStore()
  const router     = useRouter()
  const { toast, success: toastSuccess, error: toastError } = useToast()
  const [email, setEmail]       = useState('test@body-mail-notification.com')
  const [password, setPassword] = useState('password123')
  const [loading, setLoading]   = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    const ok = await login(email, password)
    if (ok) { toastSuccess('Logged in'); router.push('/body-mail-notification/dashboard') }
    else     { toastError('Invalid credentials') }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, background: toast.type === 'success' ? '#22c55e' : '#ef4444', color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 9999 }}>{toast.msg}</div>}
      <div style={{ background: '#fff', borderRadius: 16, padding: 40, width: 360, boxShadow: '0 4px 24px rgba(0,0,0,.08)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Body Injection Test</h1>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 28 }}>MailBuilder blade_body · NotificationBuilder toMail_body</p>
        <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Email</label>
        <input value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 14, marginBottom: 12, boxSizing: 'border-box' }} />
        <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 14, marginBottom: 20, boxSizing: 'border-box' }} />
        <button onClick={handleLogin} disabled={loading} style={{ width: '100%', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </div>
    </div>
  )
}
/* @arkzen:page:login:end */

/* @arkzen:page:register */
/* @arkzen:page:layout:guest */
const RegisterPage = () => {
  const { register } = useAuthStore()
  const router       = useRouter()
  const { toast, success: toastSuccess, error: toastError } = useToast()
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)

  const handleRegister = async () => {
    setLoading(true)
    const ok = await register(name, email, password)
    if (ok) { toastSuccess('Account created'); router.push('/body-mail-notification/dashboard') }
    else     { toastError('Registration failed') }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, background: toast.type === 'success' ? '#22c55e' : '#ef4444', color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 9999 }}>{toast.msg}</div>}
      <div style={{ background: '#fff', borderRadius: 16, padding: 40, width: 360, boxShadow: '0 4px 24px rgba(0,0,0,.08)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 24 }}>Create Account</h1>
        {[['Name', name, setName, 'text'], ['Email', email, setEmail, 'email'], ['Password', password, setPassword, 'password']].map(([label, val, setter, type]: any) => (
          <div key={label} style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>{label}</label>
            <input type={type} value={val} onChange={e => setter(e.target.value)} style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
        ))}
        <button onClick={handleRegister} disabled={loading} style={{ width: '100%', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
          {loading ? 'Creating…' : 'Register'}
        </button>
      </div>
    </div>
  )
}
/* @arkzen:page:register:end */

/* @arkzen:page:dashboard */
/* @arkzen:page:layout:auth */
const DashboardPage = () => {
  const { user, logout } = useAuthStore()
  const router           = useRouter()
  const { toast, success: toastSuccess, error: toastError } = useToast()

  const [log,     setLog]     = useState<SendLogEntry[]>([])
  const [loading, setLoading] = useState(false)

  // Mail send state
  const [mailKind, setMailKind]   = useState<'welcome' | 'receipt' | 'alert'>('welcome')
  const [mailTo,   setMailTo]     = useState('')
  const [sending,  setSending]    = useState(false)

  // Notification state
  const [notifKind, setNotifKind] = useState<'action-required' | 'summary'>('action-required')
  const [notifMsg,  setNotifMsg]  = useState('')
  const [notifying, setNotifying] = useState(false)

  const loadLog = async () => {
    setLoading(true)
    try {
      const res  = await arkzenFetch('/api/body-mail-notification/log')
      const data = await res.json()
      setLog(data.data ?? data ?? [])
    } catch { toastError('Failed to load log') }
    setLoading(false)
  }

  useEffect(() => { loadLog() }, [])

  const sendMail = async () => {
    if (!mailTo) { toastError('Enter a recipient email'); return }
    setSending(true)
    try {
      const res = await arkzenFetch('/api/body-mail-notification/send-mail', {
        method: 'POST',
        body: JSON.stringify({ mail: mailKind, to: mailTo }),
      })
      if (res.ok) { toastSuccess(`${mailKind} mail sent`); loadLog() }
      else        { const e = await res.json(); toastError(e.message ?? 'Mail failed') }
    } catch { toastError('Mail request failed') }
    setSending(false)
  }

  const sendNotif = async () => {
    setNotifying(true)
    try {
      const res = await arkzenFetch('/api/body-mail-notification/notify', {
        method: 'POST',
        body: JSON.stringify({ notification: notifKind, message: notifMsg || undefined }),
      })
      if (res.ok) { toastSuccess(`${notifKind} notification sent`); loadLog() }
      else        { const e = await res.json(); toastError(e.message ?? 'Notification failed') }
    } catch { toastError('Notification request failed') }
    setNotifying(false)
  }

  const clearLog = async () => {
    try {
      await arkzenFetch('/api/body-mail-notification/log/clear', { method: 'DELETE' })
      toastSuccess('Log cleared')
      setLog([])
    } catch { toastError('Clear failed') }
  }

  const handleLogout = async () => { await logout(); router.push('/body-mail-notification') }

  const card: React.CSSProperties = {
    background: '#fff', borderRadius: 14, padding: 28,
    boxShadow: '0 2px 12px rgba(0,0,0,.06)', marginBottom: 20,
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8,
    padding: '9px 12px', fontSize: 13, boxSizing: 'border-box',
  }
  const selectStyle: React.CSSProperties = { ...inputStyle }
  const btn = (color = '#0f172a'): React.CSSProperties => ({
    background: color, color: '#fff', border: 'none', borderRadius: 8,
    padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  })

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px' }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, background: toast.type === 'success' ? '#22c55e' : '#ef4444', color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 9999 }}>{toast.msg}</div>}
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>Body Injection Dashboard</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
              MailBuilder <code>blade_body</code> · NotificationBuilder <code>toMail_body</code>
            </p>
          </div>
          <button onClick={handleLogout} style={{ ...btn('#64748b'), fontSize: 12 }}>Logout</button>
        </div>

        {/* Send Mail */}
        <div style={card}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginTop: 0, marginBottom: 4 }}>
            ✉ Send Mail <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>blade_body injection</span>
          </h2>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
            Each mail has a custom Blade HTML view injected via <code>blade_body</code> in the DSL block. Verifies MailBuilder v3.1 generates views from body instead of stub.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Mail Type</label>
              <select value={mailKind} onChange={e => setMailKind(e.target.value as any)} style={selectStyle}>
                <option value="welcome">welcome — onboarding HTML</option>
                <option value="receipt">receipt — table layout HTML</option>
                <option value="alert">alert — CTA button HTML</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Recipient Email</label>
              <input value={mailTo} onChange={e => setMailTo(e.target.value)} placeholder="you@example.com" style={inputStyle} />
            </div>
          </div>
          <button onClick={sendMail} disabled={sending} style={btn()}>
            {sending ? 'Sending…' : 'Send Mail'}
          </button>
        </div>

        {/* Send Notification */}
        <div style={card}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginTop: 0, marginBottom: 4 }}>
            🔔 Send Notification <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>toMail_body injection</span>
          </h2>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
            Both notifications have a custom <code>toMail()</code> body injected via the DSL block. Verifies NotificationBuilder v3.9 uses the body instead of the stub.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Notification Type</label>
              <select value={notifKind} onChange={e => setNotifKind(e.target.value as any)} style={selectStyle}>
                <option value="action-required">action-required</option>
                <option value="summary">summary</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Custom Message (optional)</label>
              <input value={notifMsg} onChange={e => setNotifMsg(e.target.value)} placeholder="Override default message…" style={inputStyle} />
            </div>
          </div>
          <button onClick={sendNotif} disabled={notifying} style={btn('#7c3aed')}>
            {notifying ? 'Sending…' : 'Send Notification'}
          </button>
        </div>

        {/* Log */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>Send Log</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={loadLog} style={{ ...btn('#0ea5e9'), padding: '7px 14px', fontSize: 12 }}>Refresh</button>
              <button onClick={clearLog} style={{ ...btn('#ef4444'), padding: '7px 14px', fontSize: 12 }}>Clear</button>
            </div>
          </div>
          {loading ? (
            <p style={{ color: '#94a3b8', fontSize: 13 }}>Loading…</p>
          ) : log.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 13 }}>No entries yet — send a mail or notification above.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {log.map(entry => (
                <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 13 }}>
                  <KindBadge kind={entry.kind} />
                  <span style={{ fontWeight: 600, color: '#0f172a', flex: 1 }}>{entry.subject ?? '—'}</span>
                  <span style={{ color: '#64748b' }}>{entry.to_email ?? '—'}</span>
                  <span><StatusDot status={entry.status} />{entry.status}</span>
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>{new Date(entry.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
/* @arkzen:page:dashboard:end */