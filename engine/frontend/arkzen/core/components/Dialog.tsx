'use client'

// ============================================================
// ARKZEN ENGINE — DIALOG COMPONENT
// Three tiers of customization:
//   1. Default      — variant icons, confirm/cancel buttons
//   2. Configured   — labels, size, animation, variant
//   3. Full Custom  — renderIcon, renderContent, renderActions
//      The open/close state and backdrop are handled for you.
// ============================================================

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Trash2, Info, CheckCircle } from 'lucide-react'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface DialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  description?: string

  // ── Tier 2: Config ───────────────────────────
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info' | 'success'
  size?: 'sm' | 'md'
  animation?: 'slideUp' | 'fadeScale'

  // ── Tier 3: Full slot overrides ──────────────
  // renderIcon: replaces the icon block (the colored circle + icon)
  // renderContent: replaces the title + description block entirely
  // renderActions: replaces the cancel + confirm button row entirely
  // panelClassName: extra classes on the white panel
  renderIcon?: () => React.ReactNode
  renderContent?: (title: string, description?: string) => React.ReactNode
  renderActions?: (onConfirm: () => void, onCancel: () => void) => React.ReactNode
  panelClassName?: string
}

// ─────────────────────────────────────────────
// VARIANT CONFIG
// ─────────────────────────────────────────────

const variantConfig = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-100 dark:bg-red-950',
    iconColor: 'text-red-600 dark:text-red-400',
    confirmBtn: 'bg-red-600 hover:bg-red-700 text-white',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100 dark:bg-amber-950',
    iconColor: 'text-amber-600 dark:text-amber-400',
    confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100 dark:bg-blue-950',
    iconColor: 'text-blue-600 dark:text-blue-400',
    confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-emerald-100 dark:bg-emerald-950',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
}

const dialogAnimations = {
  slideUp: {
    initial: { opacity: 0, y: 32 },
    animate: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: 16 },
  },
  fadeScale: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit:    { opacity: 0, scale: 0.95 },
  },
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export const Dialog: React.FC<DialogProps> = ({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  size = 'sm',
  animation = 'fadeScale',
  renderIcon,
  renderContent,
  renderActions,
  panelClassName = '',
}) => {
  const config     = variantConfig[variant]
  const Icon       = config.icon
  const anim       = dialogAnimations[animation]
  const sizeClass  = size === 'sm' ? 'max-w-sm' : 'max-w-md'

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">

          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 backdrop-blur-sm bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
          />

          {/* Panel */}
          <motion.div
            className={`relative w-full ${sizeClass} bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl ring-1 ring-black/5 p-6 ${panelClassName}`}
            variants={anim}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Icon */}
            {renderIcon ? renderIcon() : (
              <div className={`w-12 h-12 rounded-2xl ${config.iconBg} flex items-center justify-center mb-4`}>
                <Icon size={22} className={config.iconColor} />
              </div>
            )}

            {/* Content */}
            {renderContent ? renderContent(title, description) : (
              <>
                <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-1">
                  {title}
                </h3>
                {description && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    {description}
                  </p>
                )}
              </>
            )}

            {/* Actions */}
            {renderActions ? renderActions(onConfirm, onCancel) : (
              <div className="flex gap-3 mt-6">
                <button
                  onClick={onCancel}
                  className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={onConfirm}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${config.confirmBtn}`}
                >
                  {confirmLabel}
                </button>
              </div>
            )}
          </motion.div>

        </div>
      )}
    </AnimatePresence>
  )
}