'use client'

// ============================================================
// ARKZEN ENGINE — AUTH LAYOUT v5.0
// Empty protected layout. No structure imposed.
// Redirects unauthenticated users to the tatemono's login page.
// Shows a minimal loader while auth check runs.
// ============================================================

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '../stores/authStore'

export interface AuthLayoutProps {
  children:     React.ReactNode
  requireAuth?: boolean
  redirectTo?:  string    // override redirect target (default: /{tatemono}/login)
  className?:   string
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  requireAuth = true,
  redirectTo,
  className = '',
}) => {
  const router                              = useRouter()
  const pathname                            = usePathname()
  const { isAuthenticated, fetchMe, token } = useAuthStore()
  const [checking, setChecking]             = useState(requireAuth)

  useEffect(() => {
    if (!requireAuth) { setChecking(false); return }

    const check = async () => {
      if (!token) {
        // Derive login page: /{tatemono-name}/login
        const segments  = pathname.split('/').filter(Boolean)
        const tatemono  = segments[0] ?? ''
        const loginPage = redirectTo ?? (tatemono ? `/${tatemono}/login` : '/login')
        router.replace(loginPage)
        return
      }

      await fetchMe()

      if (!useAuthStore.getState().isAuthenticated) {
        const segments  = pathname.split('/').filter(Boolean)
        const tatemono  = segments[0] ?? ''
        const loginPage = redirectTo ?? (tatemono ? `/${tatemono}/login` : '/login')
        router.replace(loginPage)
        return
      }

      setChecking(false)
    }

    check()
  }, [requireAuth, token])

  // Minimal loader while auth check runs — no flash of content
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
