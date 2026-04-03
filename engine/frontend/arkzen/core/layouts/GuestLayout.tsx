'use client'

// ============================================================
// ARKZEN ENGINE — GUEST LAYOUT v5.0
// Empty public layout. No structure imposed.
// Redirects already-authenticated users to the first auth page.
// ============================================================

import React, { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '../stores/authStore'

export interface GuestLayoutProps {
  children:        React.ReactNode
  redirectIfAuth?: boolean   // redirect logged-in users (default: true when auth: true in meta)
  redirectTo?:     string    // override target (default: /{tatemono}/dashboard)
  className?:      string
}

export const GuestLayout: React.FC<GuestLayoutProps> = ({
  children,
  redirectIfAuth = false,
  redirectTo,
  className = '',
}) => {
  const router                              = useRouter()
  const pathname                            = usePathname()
  const { isAuthenticated, fetchMe, token } = useAuthStore()

  useEffect(() => {
    if (!redirectIfAuth) return

    const check = async () => {
      if (token && !isAuthenticated) await fetchMe()

      if (useAuthStore.getState().isAuthenticated) {
        // Derive dashboard: /{tatemono-name}/dashboard
        const segments      = pathname.split('/').filter(Boolean)
        const tatemono      = segments[0] ?? ''
        const dashboardPage = redirectTo ?? (tatemono ? `/${tatemono}/dashboard` : '/dashboard')
        router.replace(dashboardPage)
      }
    }

    check()
  }, [redirectIfAuth, token])

  return (
    <div className={className}>
      {children}
    </div>
  )
}
