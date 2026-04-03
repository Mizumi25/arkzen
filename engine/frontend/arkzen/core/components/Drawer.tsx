'use client'

// ============================================================
// ARKZEN ENGINE — DRAWER COMPONENT
// Three tiers of customization:
//   1. Default      — side panel with title, description, close btn
//   2. Configured   — side, size, showClose
//   3. Full Custom  — renderHeader, panelClassName, bodyClassName
//      The open/close animation, scroll lock, Escape key,
//      and backdrop are always handled for you.
// ============================================================

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface DrawerProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode

  // ── Tier 2: Config ───────────────────────────
  title?: string
  description?: string
  side?: 'left' | 'right'
  size?: 'sm' | 'md' | 'lg' | 'full'
  showClose?: boolean

  // ── Tier 3: Full slot overrides ──────────────
  // renderHeader: replaces the entire header (title + close btn)
  // panelClassName: change bg, shadow, border, width, anything on the panel
  // bodyClassName: change padding/overflow on the scrollable body
  // backdropClassName: change the overlay behind the drawer
  renderHeader?: (onClose: () => void) => React.ReactNode
  panelClassName?: string
  bodyClassName?: string
  backdropClassName?: string
}

// ─────────────────────────────────────────────
// SIZE MAP
// ─────────────────────────────────────────────

const sizeMap = {
  sm:   'w-72',
  md:   'w-96',
  lg:   'w-[480px]',
  full: 'w-screen',
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  side = 'right',
  size = 'md',
  showClose = true,
  renderHeader,
  panelClassName = '',
  bodyClassName = '',
  backdropClassName = '',
}) => {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const xFrom = side === 'right' ? '100%' : '-100%'

  // Default header
  const defaultHeader = (title || showClose) ? (
    <div className="flex items-start justify-between px-6 py-5 border-b border-neutral-100 dark:border-neutral-800">
      <div>
        {title && (
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
            {title}
          </h2>
        )}
        {description && (
          <p className="mt-0.5 text-sm text-neutral-500">{description}</p>
        )}
      </div>
      {showClose && (
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <X size={18} />
        </button>
      )}
    </div>
  ) : null

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex">

          {/* Backdrop */}
          <motion.div
            className={`absolute inset-0 backdrop-blur-sm bg-black/40 ${backdropClassName}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className={`
              absolute top-0 ${side === 'right' ? 'right-0' : 'left-0'} h-full
              ${sizeMap[size]} bg-white dark:bg-neutral-900
              shadow-2xl flex flex-col ${panelClassName}
            `}
            initial={{ x: xFrom }}
            animate={{ x: 0 }}
            exit={{ x: xFrom }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
          >
            {/* Header */}
            {renderHeader ? renderHeader(onClose) : defaultHeader}

            {/* Body */}
            <div className={`flex-1 overflow-y-auto px-6 py-5 ${bodyClassName}`}>
              {children}
            </div>
          </motion.div>

        </div>
      )}
    </AnimatePresence>
  )
}