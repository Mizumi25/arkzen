// ============================================================
// ARKZEN ENGINE — MIDDLEWARE v1.0
//
// Server-side auth guard. Runs before any page renders — no
// hydration, no JS, no flash. Instant redirect at the edge.
//
// HOW IT WORKS:
//   authStore writes a cookie (arkzen-auth-{slug}) on login.
//   This middleware reads that cookie on every request and
//   redirects before Next.js even builds the page.
//
// GUEST PAGES  (login, register, etc.)
//   → Authenticated users get bounced to /{tatemono}/dashboard
//
// AUTH PAGES   (dashboard, etc.)
//   → Unauthenticated users get bounced to /{tatemono}/login
//
// TO ADD MORE PROTECTED OR GUEST-ONLY PAGES:
//   Add the page name to GUEST_PAGES or AUTH_PAGES below.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'

// ─────────────────────────────────────────────
// PAGE CLASSIFICATIONS
// Add page names here as your tatemonos grow.
// These match the URL segment, e.g. /auth-test/dashboard → 'dashboard'
// ─────────────────────────────────────────────

const GUEST_PAGES = [
  'login',
  'register',
  'forgot-password',
  'reset-password',
]

const AUTH_PAGES = [
  'dashboard',
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

  // Read the per-tatemono auth cookie set by authStore on login
  const token = request.cookies.get(`arkzen-auth-${tatemono}`)?.value

  // Authenticated user trying to visit login/register → send to dashboard
  if (GUEST_PAGES.includes(page) && token) {
    return NextResponse.redirect(new URL(`/${tatemono}/dashboard`, request.url))
  }

  // Unauthenticated user trying to visit dashboard → send to login
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