// ============================================================
// ARKZEN ENGINE — MIDDLEWARE v1.1
//
// Server-side auth guard. Runs before any page renders — no
// hydration, no JS, no flash. Instant redirect at the edge.
//
// HOW IT WORKS:
//   authStore writes a cookie (arkzen-auth-{slug}) on login.
//   This middleware reads that cookie on every request and
//   redirects before Next.js even builds the page.
//
// IMPORTANT: Only tatemonos listed in AUTH_TATEMONOS are
// subject to auth guards. All others pass through freely
// regardless of page name.
//
// Add your tatemono name here when auth: true is set in its meta.
// Remove it when auth: false.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'

// ─────────────────────────────────────────────
// AUTH-ENABLED TATEMONOS
// Only these tatemonos will have login/guest guards enforced.
// Add a tatemono name here when its meta has auth: true.
// ─────────────────────────────────────────────

const AUTH_TATEMONOS = [
  'auth-test',
]

// ─────────────────────────────────────────────
// PAGE CLASSIFICATIONS
// These only apply to tatemonos listed in AUTH_TATEMONOS above.
// ─────────────────────────────────────────────

const GUEST_PAGES = [
  'login',
  'register',
  'forgot-password',
  'reset-password',
]

const AUTH_PAGES = [
  'dashboard',
  'settings',
  'profile',
]

// ─────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const segments     = pathname.split('/').filter(Boolean)
  const tatemono     = segments[0]  // e.g. 'auth-test'
  const page         = segments[1]  // e.g. 'login', 'dashboard'

  // Not a tatemono route — let it through
  if (!tatemono || !page) return NextResponse.next()

  // Not an auth-enabled tatemono — always let it through
  if (!AUTH_TATEMONOS.includes(tatemono)) return NextResponse.next()

  // Read the per-tatemono auth cookie set by authStore on login
  const token = request.cookies.get(`arkzen-auth-${tatemono}`)?.value

  // Authenticated user trying to visit login/register → send to dashboard
  if (GUEST_PAGES.includes(page) && token) {
    return NextResponse.redirect(new URL(`/${tatemono}/dashboard`, request.url))
  }

  // Unauthenticated user trying to visit protected page → send to login
  if (AUTH_PAGES.includes(page) && !token) {
    return NextResponse.redirect(new URL(`/${tatemono}/login`, request.url))
  }

  return NextResponse.next()
}

// ─────────────────────────────────────────────
// MATCHER
// Runs on all routes except Next.js internals and the API.
// ─────────────────────────────────────────────

export const config = {
  matcher: ['/((?!_next|api|arkzen|static|favicon.ico).*)'],
}