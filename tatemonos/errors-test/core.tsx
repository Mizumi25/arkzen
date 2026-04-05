/* @arkzen:meta
name: errors-test
version: 1.0.0
description: Tests HTTP error status pages — 400, 401, 403, 404, 409, 422, 429, 500, 503. Each page is a proper full-screen error UI with status code, message, and recovery action.
auth: false
*/

/* @arkzen:config
layout:
  guest:
    className: "min-h-screen"
*/

/* @arkzen:api
routes:
  - GET /errors-test/simulate/{code}  → simulate
*/

/* @arkzen:components:shared */

'use client'

import React, { useState } from 'react'
import { arkzenFetch } from '@/arkzen/core/stores/authStore'

type ErrorDef = {
  code: number
  title: string
  message: string
  emoji: string
  action?: { label: string; href: string }
  color: string
  bg: string
}

const ERRORS: ErrorDef[] = [
  { code: 400, title: 'Bad Request',            message: 'The server could not understand the request. Check the data you sent.',               emoji: '🤔', color: 'text-yellow-700',  bg: 'bg-yellow-50',  action: { label: 'Go back',     href: 'javascript:history.back()' } },
  { code: 401, title: 'Unauthorized',           message: 'You need to be logged in to access this. Please sign in and try again.',              emoji: '🔐', color: 'text-blue-700',    bg: 'bg-blue-50',    action: { label: 'Sign in',     href: '/auth-test/login' } },
  { code: 403, title: 'Forbidden',              message: 'You don\'t have permission to access this resource. Contact an admin if needed.',     emoji: '🚫', color: 'text-orange-700',  bg: 'bg-orange-50',  action: { label: 'Go home',     href: '/' } },
  { code: 404, title: 'Not Found',              message: 'The page or resource you\'re looking for doesn\'t exist or has been moved.',          emoji: '🗺️', color: 'text-neutral-700', bg: 'bg-neutral-50', action: { label: 'Go home',     href: '/' } },
  { code: 409, title: 'Conflict',               message: 'A conflict occurred with the current state of the resource. Refresh and try again.',  emoji: '⚡', color: 'text-purple-700',  bg: 'bg-purple-50',  action: { label: 'Refresh',     href: 'javascript:location.reload()' } },
  { code: 422, title: 'Validation Error',       message: 'The data you submitted is invalid. Please check your input and try again.',           emoji: '📋', color: 'text-pink-700',    bg: 'bg-pink-50',    action: { label: 'Go back',     href: 'javascript:history.back()' } },
  { code: 429, title: 'Too Many Requests',      message: 'You\'ve made too many requests in a short time. Please wait a moment and try again.', emoji: '⏱️', color: 'text-amber-700',   bg: 'bg-amber-50',   action: { label: 'Wait & retry', href: 'javascript:location.reload()' } },
  { code: 500, title: 'Server Error',           message: 'Something went wrong on our end. We\'ve been notified. Please try again shortly.',    emoji: '💥', color: 'text-red-700',     bg: 'bg-red-50',     action: { label: 'Try again',   href: 'javascript:location.reload()' } },
  { code: 503, title: 'Service Unavailable',    message: 'The service is temporarily offline for maintenance. We\'ll be back soon.',            emoji: '🔧', color: 'text-slate-700',   bg: 'bg-slate-50',   action: { label: 'Refresh',     href: 'javascript:location.reload()' } },
]

// ─────────────────────────────────────────────
// SHARED ERROR SCREEN COMPONENT
// Reused by every error page above.
// ─────────────────────────────────────────────
const ErrorScreen = ({ code }: { code: number }) => {
  const err = ERRORS.find(e => e.code === code) ?? {
    code,
    title: 'Error',
    message: 'An unexpected error occurred.',
    emoji: '❓',
    color: 'text-neutral-700',
    bg: 'bg-neutral-50',
    action: { label: 'Go home', href: '/' },
  }

  return (
    <div className={`min-h-screen flex items-center justify-center ${err.bg} px-4`}>
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">{err.emoji}</div>
        <div className={`text-7xl font-black mb-3 ${err.color}`}>{err.code}</div>
        <h1 className="text-xl font-bold text-neutral-900 mb-3">{err.title}</h1>
        <p className="text-sm text-neutral-500 leading-relaxed mb-8">{err.message}</p>
        <div className="flex items-center justify-center gap-3">
          {err.action && (
            <a
              href={err.action.href}
              className="inline-flex items-center gap-2 bg-neutral-900 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-neutral-700 transition-colors"
            >
              {err.action.label}
            </a>
          )}
          <a
            href="/"
            className="inline-flex items-center gap-2 bg-white text-neutral-700 text-sm font-medium px-5 py-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 transition-colors"
          >
            Home
          </a>
        </div>
        <div className="mt-8 text-xs text-neutral-300">
          Error {err.code} · Arkzen errors-test
        </div>
      </div>
    </div>
  )
}

/* @arkzen:components:shared:end */

/* @arkzen:page:index */
/* @arkzen:page:layout:guest */
const IndexPage = () => {
  const [simulating, setSimulating] = useState<number | null>(null)
  const [result, setResult]         = useState<{ code: number; body: string } | null>(null)

  const simulate = async (code: number) => {
    setSimulating(code)
    setResult(null)
    try {
      const res  = await arkzenFetch(`/api/errors-test/simulate/${code}`)
      const text = await res.text()
      setResult({ code: res.status, body: text })
    } catch (e) {
      setResult({ code: 0, body: e instanceof Error ? e.message : 'Network error' })
    } finally {
      setSimulating(null)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">🚦 Error Pages Test</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Click any status code to preview its error page, or simulate the backend response.
          </p>
        </div>

        {/* Error page previews */}
        <div className="grid gap-3">
          {ERRORS.map(err => (
            <div key={err.code} className={`rounded-2xl border p-5 ${err.bg}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{err.emoji}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${err.color}`}>{err.code}</span>
                      <span className="font-medium text-sm text-neutral-700">{err.title}</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5 max-w-md">{err.message}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <a
                    href={`/errors-test/${err.code}`}
                    target="_blank"
                    className="text-xs text-neutral-500 border border-neutral-200 bg-white px-3 py-1.5 rounded-lg hover:bg-neutral-50"
                  >
                    Preview page →
                  </a>
                  <button
                    className="text-xs text-neutral-500 border border-neutral-200 bg-white px-3 py-1.5 rounded-lg hover:bg-neutral-50"
                    onClick={() => simulate(err.code)}
                    disabled={simulating === err.code}
                  >
                    {simulating === err.code ? '...' : 'Simulate API'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* API simulation result */}
        {result && (
          <div className="bg-white rounded-2xl border border-neutral-100 p-5">
            <div className="text-sm font-medium mb-2">API Response — HTTP {result.code}</div>
            <pre className="text-xs text-neutral-500 bg-neutral-50 rounded-lg p-3 overflow-x-auto">
              {result.body}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
/* @arkzen:page:index:end */

/* @arkzen:page:400 */
/* @arkzen:page:layout:guest */
const BadRequestPage = () => <ErrorScreen code={400} />
/* @arkzen:page:400:end */

/* @arkzen:page:401 */
/* @arkzen:page:layout:guest */
const UnauthorizedPage = () => <ErrorScreen code={401} />
/* @arkzen:page:401:end */

/* @arkzen:page:403 */
/* @arkzen:page:layout:guest */
const ForbiddenPage = () => <ErrorScreen code={403} />
/* @arkzen:page:403:end */

/* @arkzen:page:404 */
/* @arkzen:page:layout:guest */
const NotFoundPage = () => <ErrorScreen code={404} />
/* @arkzen:page:404:end */

/* @arkzen:page:409 */
/* @arkzen:page:layout:guest */
const ConflictPage = () => <ErrorScreen code={409} />
/* @arkzen:page:409:end */

/* @arkzen:page:422 */
/* @arkzen:page:layout:guest */
const ValidationPage = () => <ErrorScreen code={422} />
/* @arkzen:page:422:end */

/* @arkzen:page:429 */
/* @arkzen:page:layout:guest */
const RateLimitPage = () => <ErrorScreen code={429} />
/* @arkzen:page:429:end */

/* @arkzen:page:500 */
/* @arkzen:page:layout:guest */
const ServerErrorPage = () => <ErrorScreen code={500} />
/* @arkzen:page:500:end */

/* @arkzen:page:503 */
/* @arkzen:page:layout:guest */
const ServiceUnavailablePage = () => <ErrorScreen code={503} />
/* @arkzen:page:503:end */