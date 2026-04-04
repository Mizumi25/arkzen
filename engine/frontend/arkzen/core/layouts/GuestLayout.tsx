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

  // Either prop triggers the guard — guestOnly is just an alias
  const shouldGuard = redirectIfAuth || guestOnly

  useEffect(() => {
    if (!shouldGuard) return

    const check = async () => {
      if (token && !isAuthenticated) await fetchMe()

      if (useAuthStore.getState().isAuthenticated) {
        const segments      = pathname.split('/').filter(Boolean)
        const tatemono      = segments[0] ?? ''
        const dashboardPage = redirectTo ?? (tatemono ? `/${tatemono}/dashboard` : '/dashboard')
        router.replace(dashboardPage)
      }
    }

    check()
  }, [shouldGuard, token])

  return (
    <div className={className}>
      {children}
    </div>
  )
}
