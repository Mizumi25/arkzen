'use client'

// ============================================================
// ARKZEN ENGINE — AUTH LAYOUT v6.0 (PER-TATEMONO AUTH)
// Empty protected layout. No structure imposed.
// Redirects unauthenticated users to the tatemono's login page.
// Shows a minimal loader while auth check runs.
//
// v6.0: Derives the tatemono slug from the URL path and registers
// it via setActiveTatemono() so the auth store hits the correct
// isolated backend (/api/{slug}/auth/*). Each tatemono is fully
// independent — no shared user pool.
// ============================================================

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore, setActiveTatemono } from '../stores/authStore'

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
    // Derive tatemono slug from URL and register it BEFORE any auth network call
    const segments = pathname.split('/').filter(Boolean)
    const tatemono = segments[0] ?? ''
    if (tatemono) setActiveTatemono(tatemono)

    if (!requireAuth) { setChecking(false); return }

    const check = async () => {
      if (!token) {
        const loginPage = redirectTo ?? (tatemono ? `/${tatemono}/login` : '/login')
        router.replace(loginPage)
        return
      }

      await fetchMe()

      if (!useAuthStore.getState().isAuthenticated) {
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
