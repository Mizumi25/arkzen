'use client'

// ============================================================
// ARKZEN ENGINE — MODAL COMPONENT
// Three tiers of customization:
//   1. Default      — title, description, children, size, animation
//   2. Configured   — borderRadius, backdrop, animation, showClose
//   3. Full Custom  — renderHeader, renderFooter, panelClassName
//      The open/close state, scroll lock, Escape key, and
//      backdrop are handled for you no matter what you pass.
// ============================================================

import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface ModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode

  // ── Tier 2: Config ───────────────────────────
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showClose?: boolean
  closeOnBackdrop?: boolean
  borderRadius?: string
  backdrop?: 'blur' | 'dark' | 'none'
  animation?: 'fadeScale' | 'slideUp' | 'slideDown' | 'fade'

  // ── Tier 3: Full slot overrides ──────────────
  // renderHeader: replaces the entire header block (title + close btn)
  // renderFooter: adds a footer below children (action buttons, etc.)
  // panelClassName: extra classes on the white panel — change bg, radius, shadow, etc.
  // backdropClassName: extra classes on the backdrop overlay
  renderHeader?: (onClose: () => void) => React.ReactNode
  renderFooter?: (onClose: () => void) => React.ReactNode
  panelClassName?: string
  backdropClassName?: string
  className?: string   // the fixed outer wrapper
}

// ─────────────────────────────────────────────
// ANIMATION VARIANTS
// ─────────────────────────────────────────────

const animations = {
  fadeScale: {
    initial: { opacity: 0, scale: 0.92, y: 8 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit:    { opacity: 0, scale: 0.95, y: 4 },
  },
  slideUp: {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: 20 },
  },
  slideDown: {
    initial: { opacity: 0, y: -40 },
    animate: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: -20 },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit:    { opacity: 0 },
  },
}

const sizeMap = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-2xl',
  full: 'max-w-full mx-4',
}

const backdropMap = {
  blur: 'backdrop-blur-md bg-black/40',
  dark: 'bg-black/60',
  none: 'bg-transparent',
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showClose = true,
  closeOnBackdrop = true,
  borderRadius = '2xl',
  backdrop = 'blur',
  animation = 'fadeScale',
  renderHeader,
  renderFooter,
  panelClassName = '',
  backdropClassName = '',
  className = '',
}) => {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const variant       = animations[animation]
  const backdropClass = backdropMap[backdrop]
  const sizeClass     = sizeMap[size]

  // Default header
  const defaultHeader = (title || showClose) ? (
    <div className="flex items-start justify-between px-6 pt-6 pb-4">
      <div>
        {title && (
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white leading-tight">
            {title}
          </h2>
        )}
        {description && (
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {description}
          </p>
        )}
      </div>
      {showClose && (
        <button
          onClick={onClose}
          className="ml-4 flex-shrink-0 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <X size={18} />
        </button>
      )}
    </div>
  ) : null

  return (
    <AnimatePresence>
      {open && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${className}`}>

          {/* Backdrop */}
          <motion.div
            ref={overlayRef}
            className={`absolute inset-0 ${backdropClass} ${backdropClassName}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeOnBackdrop ? onClose : undefined}
          />

          {/* Panel */}
          <motion.div
            className={`relative w-full ${sizeClass} bg-white dark:bg-neutral-900 rounded-${borderRadius} shadow-2xl ring-1 ring-black/5 ${panelClassName}`}
            variants={variant}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            {renderHeader ? renderHeader(onClose) : defaultHeader}

            {/* Body */}
            <div className={`px-6 ${title || renderHeader ? 'pb-6' : 'py-6'}`}>
              {children}
            </div>

            {/* Footer */}
            {renderFooter && (
              <div className="px-6 pb-6">
                {renderFooter(onClose)}
              </div>
            )}
          </motion.div>

        </div>
      )}
    </AnimatePresence>
  )
}