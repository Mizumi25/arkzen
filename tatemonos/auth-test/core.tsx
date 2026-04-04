/* @arkzen:meta
name: auth-test
version: 1.0.0
description: 3-page auth tatemono — register, login, dashboard
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
    className: "min-h-screen bg-white"
*/

// ─────────────────────────────────────────────────────────────────
// NO database:users block — users table is managed by Laravel.
// NO api:auth block      — login/register/logout/me are provided
//                          by ArkzenAuthController (built at setup).
//
// Auth on the frontend is handled entirely through useAuthStore():
//   login(email, password)  →  POST /api/auth/login
//   register(name, email, password, confirm)  →  POST /api/auth/register
//   logout()                →  POST /api/auth/logout
//   user                    ←  current ArkzenUser object
//   isAuthenticated         ←  boolean
//
// layout:guest pages auto-redirect logged-in users to /dashboard.
// layout:auth  pages auto-redirect guests to /login.
// ─────────────────────────────────────────────────────────────────

/* @arkzen:components:shared */

'use client'

import React, { useState, useEffect } from 'react'
import { useAuthStore, setActiveTatemono } from '@/arkzen/core/stores/authStore'

// Register this tatemono's slug so all auth calls hit /api/auth-test/auth/*
// This must run before any useAuthStore() call touches the network.
if (typeof window !== 'undefined') {
  setActiveTatemono('auth-test')
}

/* @arkzen:components:shared:end */

/* @arkzen:page:register */
/* @arkzen:page:layout:guest */
const RegisterPage = () => {
  const { register, isLoading } = useAuthStore()
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState<string | null>(null)

  const handleSubmit = async () => {
    setError(null)
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    try {
      await register(name, email, password, confirm)
      // useAuthStore sets isAuthenticated = true → GuestLayout redirects
      // to /auth-test/dashboard automatically. No manual redirect needed.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-black/5 p-8">

        {/* Logo + heading */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <h1 className="text-xl font-semibold text-neutral-900">Create your account</h1>
          <p className="text-sm text-neutral-500 mt-1">Start using auth-test today</p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="arkzen-input w-full"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="arkzen-input w-full"
          />
          <input
            type="password"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="arkzen-input w-full"
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="arkzen-input w-full"
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading || !name || !email || !password || !confirm}
            className="arkzen-btn-primary w-full"
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </div>

        <p className="text-center text-sm text-neutral-500 mt-6">
          Already have an account?{' '}
          <a href="/auth-test/login" className="text-neutral-900 font-medium hover:underline">
            Sign in
          </a>
        </p>

      </div>
    </div>
  )
}
/* @arkzen:page:register:end */

/* @arkzen:page:login */
/* @arkzen:page:layout:guest */
const LoginPage = () => {
  const { login, isLoading } = useAuthStore()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)

  const handleSubmit = async () => {
    setError(null)
    try {
      await login(email, password)
      // useAuthStore sets isAuthenticated = true → GuestLayout redirects
      // to /auth-test/dashboard automatically. No manual redirect needed.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid email or password')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-black/5 p-8">

        {/* Logo + heading */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <h1 className="text-xl font-semibold text-neutral-900">Sign in</h1>
          <p className="text-sm text-neutral-500 mt-1">Welcome back</p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="arkzen-input w-full"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="arkzen-input w-full"
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading || !email || !password}
            className="arkzen-btn-primary w-full"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>

        <p className="text-center text-sm text-neutral-500 mt-6">
          No account?{' '}
          <a href="/auth-test/register" className="text-neutral-900 font-medium hover:underline">
            Create one
          </a>
        </p>

      </div>
    </div>
  )
}
/* @arkzen:page:login:end */

/* @arkzen:page:dashboard */
/* @arkzen:page:layout:auth */
const DashboardPage = () => {
  const { user, logout, isLoading } = useAuthStore()

  return (
    <div className="flex h-screen bg-neutral-50">

      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-neutral-200 flex flex-col p-4">
        <div className="mb-8">
          <div className="w-8 h-8 bg-neutral-900 rounded-xl flex items-center justify-center mb-2">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <h2 className="font-bold text-neutral-900">auth-test</h2>
        </div>

        <nav className="flex-1 space-y-1">
          <a
            href="/auth-test/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900 text-white text-sm"
          >
            Dashboard
          </a>
        </nav>

        {/* User info + sign out */}
        <div className="pt-4 border-t border-neutral-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-neutral-600">
                {user?.name?.charAt(0).toUpperCase() ?? '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 truncate">{user?.name}</p>
              <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            disabled={isLoading}
            className="text-xs text-neutral-400 hover:text-red-500 transition-colors"
          >
            {isLoading ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-neutral-200 px-6 flex items-center justify-between">
          <h1 className="font-semibold text-neutral-900">Dashboard</h1>
          <span className="text-sm text-neutral-500">
            Welcome, {user?.name?.split(' ')[0]}
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {/* Auth status cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="arkzen-card p-6">
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2">
                Auth Status
              </p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                <p className="text-sm font-semibold text-neutral-900">Authenticated</p>
              </div>
            </div>
            <div className="arkzen-card p-6">
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2">
                User ID
              </p>
              <p className="text-sm font-semibold text-neutral-900">#{user?.id}</p>
            </div>
          </div>

          {/* Profile table */}
          <div className="arkzen-card p-6">
            <h2 className="text-sm font-semibold text-neutral-900 mb-4">Your Profile</h2>
            <div className="space-y-0">
              {[
                { label: 'Name',         value: user?.name },
                { label: 'Email',        value: user?.email },
                { label: 'Member since', value: user?.created_at
                    ? new Date(user.created_at).toLocaleDateString()
                    : '—' },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-0"
                >
                  <span className="text-sm text-neutral-500">{label}</span>
                  <span className="text-sm font-medium text-neutral-900">{value ?? '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

    </div>
  )
}
/* @arkzen:page:dashboard:end */