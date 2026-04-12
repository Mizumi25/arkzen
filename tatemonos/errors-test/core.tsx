/* @arkzen:meta
name: errors-test
version: 1.0.0
description: Tests real HTTP error handlers. Next.js segment-scoped not-found.tsx and error.tsx. API codes trigger toasts via arkzenFetch interceptor.
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
import { useToast } from '@/arkzen/core/components/Toast'

type ErrorDef = {
  code: number
  title: string
  message: string
  action?: { label: string; href: string }
  color: string
  bg: string
  border: string
  btnColor: string
}

const ERRORS: ErrorDef[] = [
  { code: 400, title: 'Bad Request',         message: 'The server could not understand your request. Check the data you sent and try again.',         color: 'text-yellow-700',  bg: 'bg-yellow-50',  border: 'border-yellow-100', btnColor: 'bg-yellow-700 hover:bg-yellow-800',  action: { label: 'Go back',      href: 'javascript:history.back()' } },
  { code: 401, title: 'Unauthorized',        message: 'You need to be signed in to access this. Please log in and try again.',                        color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-100',   btnColor: 'bg-blue-700 hover:bg-blue-800',      action: { label: 'Sign in',      href: '/auth-test/login' } },
  { code: 403, title: 'Forbidden',           message: 'You do not have permission to access this resource. Contact an admin if you think this is wrong.', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-100', btnColor: 'bg-orange-700 hover:bg-orange-800', action: { label: 'Go home',      href: '/' } },
  { code: 404, title: 'Not Found',           message: 'The page or resource you are looking for does not exist or has been moved.',                   color: 'text-neutral-700', bg: 'bg-neutral-50', border: 'border-neutral-100', btnColor: 'bg-neutral-900 hover:bg-neutral-700', action: { label: 'Go home',     href: '/' } },
  { code: 409, title: 'Conflict',            message: 'A conflict occurred with the current state of the resource. Refresh and try again.',           color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-100', btnColor: 'bg-purple-700 hover:bg-purple-800',  action: { label: 'Refresh',      href: 'javascript:location.reload()' } },
  { code: 422, title: 'Validation Error',    message: 'The data you submitted is invalid. Please check your input and try again.',                    color: 'text-pink-700',    bg: 'bg-pink-50',    border: 'border-pink-100',   btnColor: 'bg-pink-700 hover:bg-pink-800',      action: { label: 'Go back',      href: 'javascript:history.back()' } },
  { code: 429, title: 'Too Many Requests',   message: 'You have made too many requests. Please wait a moment before trying again.',                   color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-100',  btnColor: 'bg-amber-700 hover:bg-amber-800',    action: { label: 'Wait & retry', href: 'javascript:location.reload()' } },
  { code: 500, title: 'Server Error',        message: 'Something went wrong on our end. We have been notified. Please try again shortly.',            color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-100',    btnColor: 'bg-red-700 hover:bg-red-800',        action: { label: 'Try again',    href: 'javascript:location.reload()' } },
  { code: 503, title: 'Service Unavailable', message: 'The service is temporarily offline for maintenance. We will be back soon.',                    color: 'text-slate-700',   bg: 'bg-slate-50',   border: 'border-slate-100',  btnColor: 'bg-slate-700 hover:bg-slate-800',    action: { label: 'Refresh',      href: 'javascript:location.reload()' } },
]

// Shared ErrorScreen — used by not-found.tsx, error.tsx, and the index previews
export const ErrorScreen = ({ code, reset }: { code: number; reset?: () => void }) => {
  const err = ERRORS.find(e => e.code === code) ?? {
    code,
    title: 'Error',
    message: 'An unexpected error occurred.',
    color: 'text-neutral-700',
    bg: 'bg-neutral-50',
    border: 'border-neutral-100',
    btnColor: 'bg-neutral-900 hover:bg-neutral-700',
    action: { label: 'Go home', href: '/' },
  }

  const primaryHref  = reset ? undefined : err.action?.href
  const primaryLabel = reset ? 'Try again'  : err.action?.label

  return (
    <div className={'min-h-screen flex items-center justify-center ' + err.bg + ' px-4'}>
      <div className="text-center max-w-md w-full">
        <div className={'text-8xl font-black tracking-tight mb-2 ' + err.color}>{err.code}</div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-3">{err.title}</h1>
        <p className="text-sm text-neutral-500 leading-relaxed mb-10">{err.message}</p>
        <div className="flex items-center justify-center gap-3">
          {primaryLabel && (
            reset ? (
              <button
                onClick={reset}
                className={'text-sm font-medium text-white px-6 py-2.5 rounded-xl transition-colors ' + err.btnColor}
              >
                {primaryLabel}
              </button>
            ) : (
              <a
                href={primaryHref}
                className={'text-sm font-medium text-white px-6 py-2.5 rounded-xl transition-colors ' + err.btnColor}
              >
                {primaryLabel}
              </a>
            )
          )}
          <a
            href="/"
            className="text-sm font-medium text-neutral-600 bg-white px-6 py-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 transition-colors"
          >
            Home
          </a>
        </div>
        <p className="mt-10 text-xs text-neutral-300">Error {err.code}</p>
      </div>
    </div>
  )
}

/* @arkzen:components:shared:end */

/* @arkzen:page:index */
/* @arkzen:page:layout:guest */
const IndexPage = () => {
  const [simulating, setSimulating] = useState<number | null>(null)
  const [result, setResult] = useState<{ code: number; body: string } | null>(null)
  const { toast } = useToast()

  const API_CODES  = [400, 401, 403, 409, 422, 429, 503]
  const NEXT_CODES = [404, 500]

  const simulate = async (code: number) => {
    setSimulating(code)
    setResult(null)
    try {
      const res  = await arkzenFetch(`/api/errors-test/simulate/${code}`)
      const text = await res.text()
      setResult({ code: res.status, body: text })
      const err = ERRORS.find(e => e.code === res.status)
      if (err && API_CODES.includes(res.status)) {
        const type = res.status === 429 ? 'warning' as const : res.status === 401 ? 'info' as const : 'error' as const
        toast[type](`${res.status} ${err.title} — ${err.message}`)
      }
    } catch (e) {
      toast.error('Network error — could not reach the server.')
    } finally {
      setSimulating(null)
    }
  }

  const triggerCrash = () => { throw new Error('Intentional crash to trigger error.tsx') }

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="max-w-2xl mx-auto space-y-8">

        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Error Handler Test</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Verify all 9 error codes. Next.js handlers are triggered for real — no fake preview pages.
            API codes fire toasts via the arkzenFetch interceptor.
          </p>
        </div>

        {/* Next.js real handlers */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
            Next.js Segment Handlers
          </h2>

          <div className="bg-white rounded-2xl border border-neutral-100 p-5 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base font-bold text-neutral-900">404</span>
                <span className="text-sm text-neutral-600">Not Found</span>
                <code className="text-xs bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-lg">not-found.tsx</code>
              </div>
              <p className="text-xs text-neutral-400">Navigate to any non-existent route under /errors-test/ to trigger the real handler.</p>
            </div>
            <a
              href="/errors-test/trigger-not-found"
              className="shrink-0 text-xs font-medium bg-neutral-900 text-white px-4 py-2 rounded-xl hover:bg-neutral-700 transition-colors"
            >
              Trigger
            </a>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-100 p-5 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base font-bold text-neutral-900">500</span>
                <span className="text-sm text-neutral-600">Server Error</span>
                <code className="text-xs bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-lg">error.tsx</code>
              </div>
              <p className="text-xs text-neutral-400">Throws a runtime error in this component to trigger the real error boundary.</p>
            </div>
            <button
              onClick={triggerCrash}
              className="shrink-0 text-xs font-medium bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-colors"
            >
              Trigger
            </button>
          </div>
        </div>

        {/* API toast codes */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
            API Response Codes — Toast
          </h2>
          {ERRORS.filter(e => API_CODES.includes(e.code)).map(err => (
            <div key={err.code} className="bg-white rounded-2xl border border-neutral-100 p-5 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={'text-base font-bold ' + err.color}>{err.code}</span>
                  <span className="text-sm text-neutral-600">{err.title}</span>
                  <code className="text-xs bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-lg">toast</code>
                </div>
                <p className="text-xs text-neutral-400 max-w-sm">{err.message}</p>
              </div>
              <button
                onClick={() => simulate(err.code)}
                disabled={simulating === err.code}
                className="shrink-0 text-xs font-medium bg-neutral-900 text-white px-4 py-2 rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-40"
              >
                {simulating === err.code ? '...' : 'Simulate'}
              </button>
            </div>
          ))}
        </div>

        {result && (
          <div className="bg-white rounded-2xl border border-neutral-100 p-5">
            <p className="text-xs font-medium text-neutral-500 mb-2">Last API response — HTTP {result.code}</p>
            <pre className="text-xs text-neutral-400 bg-neutral-50 rounded-xl p-3 overflow-x-auto">{result.body}</pre>
          </div>
        )}

      </div>
    </div>
  )
}
/* @arkzen:page:index:end */

/* @arkzen:error:404 */
const NotFoundPage = () => <ErrorScreen code={404} />
/* @arkzen:error:404:end */

/* @arkzen:error:500 */
const ServerErrorPage = ({ reset }: { reset: () => void }) => <ErrorScreen code={500} reset={reset} />
/* @arkzen:error:500:end */