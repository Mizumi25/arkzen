'use client'

// ============================================================
// ARKZEN ENGINE — GUEST LAYOUT v6.0
// Empty public layout. No structure imposed.
//
// TWO GUARD MODES:
//
//   redirectIfAuth (default when meta: auth: true)
//     → Logged-in users get bounced to /{tatemono}/dashboard.
//       Use on: login, register, forgot-password pages.
//       i.e. "you're already in, go back home"
//
//   guestOnly
//     → SAME behaviour as redirectIfAuth.
//       Explicit alias for clarity in tatemono declarations.
//       Use this when you want to be obvious about intent.
//       Both props do the same thing — guestOnly is just
//       self-documenting for pages like login/register.
//
//   Neither prop set → public page, no redirects at all.
//     Use on: landing, about, pricing, etc.
//     Authenticated and unauthenticated users both see it.
// ============================================================

import React, { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '../stores/authStore'

export interface GuestLayoutProps {
  children:        React.ReactNode
  redirectIfAuth?: boolean   // redirect logged-in users → dashboard
  guestOnly?:      boolean   // alias of redirectIfAuth, more explicit
  redirectTo?:     string    // override redirect target
  className?:      string
}

export const GuestLayout: React.FC<GuestLayoutProps> = ({
  children,
  redirectIfAuth = false,
  guestOnly      = false,
  redirectTo,
  className = '',
}) => {
  const router                              = useRouter()
  const pathname                            = usePathname()
  const { isAuthenticated, fetchMe, token } = useAuthStore()
  const shouldGuard = redirectIfAuth || guestOnly

  // ── Add this ──
  const [checking, setChecking] = React.useState(shouldGuard)

  useEffect(() => {
    if (!shouldGuard) { setChecking(false); return }

    if (useAuthStore.getState().isAuthenticated) {
      const segments = pathname.split('/').filter(Boolean)
      const tatemono = segments[0] ?? ''
      router.replace(redirectTo ?? (tatemono ? `/${tatemono}/dashboard` : '/dashboard'))
      return
    }

    const check = async () => {
      if (token && !isAuthenticated) await fetchMe()
      if (useAuthStore.getState().isAuthenticated) {
        const segments = pathname.split('/').filter(Boolean)
        const tatemono = segments[0] ?? ''
        router.replace(redirectTo ?? (tatemono ? `/${tatemono}/dashboard` : '/dashboard'))
      } else {
        setChecking(false) // ← not authenticated, safe to show the page
      }
    }

    check()
  }, [shouldGuard, token])

  // ── Block render until we know auth state ──
  if (checking) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-700 rounded-full animate-spin" />
    </div>
  )
}

  return (
    <div className={className}>
      {children}
    </div>
  )
}
