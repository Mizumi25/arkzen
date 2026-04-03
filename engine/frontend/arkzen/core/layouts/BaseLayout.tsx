'use client'

// ============================================================
// ARKZEN ENGINE — BASE LAYOUT
// Three tiers of customization:
//   1. Default        — pass nothing, works out of the box
//   2. Configured     — pass brandName, navItems, brandLogo
//   3. Full Custom    — pass sidebar/topbar slots, replace everything
//      The slot replaces the entire section's DOM/structure.
//      Routing, auth guard, and mobile logic still run underneath.
// ============================================================

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Settings, Menu, X,
  ChevronRight, Bell, Search, LogOut
} from 'lucide-react'
import { Avatar } from '../components/Avatar'
import { Tooltip } from '../components/utils'
import { useAuthStore } from '../stores/authStore';
// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

export interface BaseLayoutProps {
  children: React.ReactNode
  auth?: boolean

  // ── Tier 2: Simple config overrides ─────────
  brandName?: string
  brandLogo?: React.ReactNode
  navItems?: NavItem[]
  userName?: string
  userAvatar?: string

  // ── Tier 3: Full slot overrides ─────────────
  // Pass any of these to take complete control of that section.
  // Your JSX replaces the entire section — structure, skeleton,
  // element order, everything. Auth guard still runs.
  sidebar?: React.ReactNode        // replaces entire sidebar (desktop + mobile)
  topbar?: React.ReactNode         // replaces entire topbar
  mobileDrawer?: React.ReactNode   // replaces mobile drawer panel only

  // ── Extra class hooks ────────────────────────
  className?: string               // wrapper div
  mainClassName?: string           // <main> content area
}

// ─────────────────────────────────────────────
// DEFAULT NAV ITEMS
// ─────────────────────────────────────────────

const defaultNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/',         icon: <LayoutDashboard size={18} /> },
  { label: 'Settings',  href: '/settings', icon: <Settings size={18} /> },
]

// ─────────────────────────────────────────────
// NAV LINK
// ─────────────────────────────────────────────

const NavLink: React.FC<{ item: NavItem; collapsed: boolean }> = ({ item, collapsed }) => {
  const pathname = usePathname()
  const isActive = pathname === item.href

  const inner = (
    <Link
      href={item.href}
      className={`
        relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
        transition-all duration-200
        ${isActive
          ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
          : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800'
        }
        ${collapsed ? 'justify-center' : ''}
      `}
    >
      <span className="flex-shrink-0">{item.icon}</span>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden whitespace-nowrap"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
      {isActive && !collapsed && (
        <ChevronRight size={14} className="ml-auto opacity-60" />
      )}
    </Link>
  )

  if (collapsed) {
    return <Tooltip content={item.label} side="right">{inner}</Tooltip>
  }

  return inner
}

// ─────────────────────────────────────────────
// DEFAULT SIDEBAR (extracted so slots can skip it)
// ─────────────────────────────────────────────

export const DefaultSidebar: React.FC<{
  navItems: NavItem[]
  brandName: string
  brandLogo?: React.ReactNode
  collapsed: boolean
  onCollapse: () => void
}> = ({ navItems, brandName, brandLogo, collapsed, onCollapse }) => (
  <motion.aside
    animate={{ width: collapsed ? 72 : 240 }}
    transition={{ type: 'spring', stiffness: 350, damping: 35 }}
    className="hidden md:flex flex-col h-full bg-white dark:bg-neutral-900 border-r border-neutral-100 dark:border-neutral-800 overflow-hidden flex-shrink-0"
  >
    {/* Brand */}
    <div className={`flex items-center h-16 px-4 border-b border-neutral-100 dark:border-neutral-800 ${collapsed ? 'justify-center' : 'gap-3'}`}>
      <div className="w-8 h-8 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center flex-shrink-0">
        {brandLogo ?? <span className="text-white dark:text-neutral-900 text-xs font-bold">{brandName[0]}</span>}
      </div>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="font-semibold text-neutral-900 dark:text-white overflow-hidden whitespace-nowrap"
          >
            {brandName}
          </motion.span>
        )}
      </AnimatePresence>
    </div>

    {/* Nav */}
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      {navItems.map(item => (
        <NavLink key={item.href} item={item} collapsed={collapsed} />
      ))}
    </nav>

    {/* Collapse toggle */}
    <div className="px-3 py-4 border-t border-neutral-100 dark:border-neutral-800">
      <button
        onClick={onCollapse}
        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${collapsed ? 'justify-center' : ''}`}
      >
        <motion.div animate={{ rotate: collapsed ? 0 : 180 }} transition={{ duration: 0.3 }}>
          <ChevronRight size={16} />
        </motion.div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden whitespace-nowrap"
            >
              Collapse
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </div>
  </motion.aside>
)

// ─────────────────────────────────────────────
// DEFAULT TOPBAR
// ─────────────────────────────────────────────

export const DefaultTopbar: React.FC<{
  userName?: string
  userAvatar?: string
  onMobileMenuOpen: () => void
}> = ({ userName, userAvatar, onMobileMenuOpen }) => (
  <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 flex-shrink-0">
    <button
      onClick={onMobileMenuOpen}
      className="md:hidden p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
    >
      <Menu size={20} className="text-neutral-600 dark:text-neutral-400" />
    </button>

    <div className="flex items-center gap-2 ml-auto">
      <button className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
        <Search size={18} />
      </button>
      <button className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
        <Bell size={18} />
      </button>
      <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1" />
      <Avatar size="sm" name={userName ?? 'User'} src={userAvatar} />
    </div>
  </header>
)

// ─────────────────────────────────────────────
// DEFAULT MOBILE DRAWER
// ─────────────────────────────────────────────

export const DefaultMobileDrawer: React.FC<{
  navItems: NavItem[]
  brandName: string
  onClose: () => void
}> = ({ navItems, brandName, onClose }) => (
  <motion.aside
    className="fixed left-0 top-0 h-full w-64 z-50 bg-white dark:bg-neutral-900 flex flex-col md:hidden"
    initial={{ x: '-100%' }}
    animate={{ x: 0 }}
    exit={{ x: '-100%' }}
    transition={{ type: 'spring', stiffness: 350, damping: 35 }}
  >
    <div className="flex items-center justify-between h-16 px-4 border-b border-neutral-100 dark:border-neutral-800">
      <span className="font-semibold text-neutral-900 dark:text-white">{brandName}</span>
      <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800">
        <X size={18} className="text-neutral-500" />
      </button>
    </div>
    <nav className="flex-1 px-3 py-4 space-y-1">
      {navItems.map(item => (
        <NavLink key={item.href} item={item} collapsed={false} />
      ))}
    </nav>
  </motion.aside>
)

// ─────────────────────────────────────────────
// LAYOUT
// ─────────────────────────────────────────────

export const BaseLayout: React.FC<BaseLayoutProps> = ({
  children,
  auth = false,
  brandName = 'Arkzen',
  brandLogo,
  navItems = defaultNavItems,
  userName,
  userAvatar,
  sidebar,
  topbar,
  mobileDrawer,
  className = '',
  mainClassName = '',
}) => {
  const [collapsed, setCollapsed]     = useState(false)
  const [mobileOpen, setMobileOpen]   = useState(false)
  const router                        = useRouter()

  // ── Auth guard ───────────────────────────────
    const { token, fetchMe, isAuthenticated } = useAuthStore()

    useEffect(() => {
      if (!auth) return
      if (!token) { router.replace('/login'); return }
      fetchMe().then(() => {
        if (!useAuthStore.getState().isAuthenticated) router.replace('/login')
      })
    }, [auth, token])

  // ── Resolved sidebar ─────────────────────────
  // If user passes sidebar slot, render it directly (desktop only).
  // Mobile drawer uses mobileDrawer slot or DefaultMobileDrawer.
  const resolvedSidebar = sidebar ?? (
    <DefaultSidebar
      navItems={navItems}
      brandName={brandName}
      brandLogo={brandLogo}
      collapsed={collapsed}
      onCollapse={() => setCollapsed(c => !c)}
    />
  )

  const resolvedTopbar = topbar ?? (
    <DefaultTopbar
      userName={userName}
      userAvatar={userAvatar}
      onMobileMenuOpen={() => setMobileOpen(true)}
    />
  )

  const resolvedMobileDrawer = mobileDrawer ?? (
    <DefaultMobileDrawer
      navItems={navItems}
      brandName={brandName}
      onClose={() => setMobileOpen(false)}
    />
  )

  return (
    <div className={`flex h-screen bg-neutral-50 dark:bg-neutral-950 overflow-hidden ${className}`}>

      {/* ─── SIDEBAR (Desktop) ─────────────────── */}
      {resolvedSidebar}

      {/* ─── MOBILE DRAWER ─────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            {resolvedMobileDrawer}
          </>
        )}
      </AnimatePresence>

      {/* ─── MAIN CONTENT ──────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {resolvedTopbar}
        <main className={`flex-1 overflow-y-auto ${mainClassName}`}>
          {children}
        </main>
      </div>

    </div>
  )
}