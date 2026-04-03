'use client'

// ============================================================
// ARKZEN ENGINE — TOAST COMPONENT v5.0
// Added: renderToast slot for full custom toast rendering
// ============================================================

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'
type ToastPosition = 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left'

interface ToastItem {
  id:       string
  type:     ToastType
  message:  string
  duration: number
  onClose?: () => void
}

interface ToastContextValue {
  toast: {
    success: (message: string, duration?: number) => void
    error:   (message: string, duration?: number) => void
    warning: (message: string, duration?: number) => void
    info:    (message: string, duration?: number) => void
  }
}

const ToastContext = createContext<ToastContextValue | null>(null)

const toastConfig = {
  success: { icon: CheckCircle, bg: 'bg-emerald-50 dark:bg-emerald-950', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-800 dark:text-emerald-200', icon_color: 'text-emerald-500' },
  error:   { icon: XCircle,     bg: 'bg-red-50 dark:bg-red-950',         border: 'border-red-200 dark:border-red-800',         text: 'text-red-800 dark:text-red-200',         icon_color: 'text-red-500'     },
  warning: { icon: AlertCircle, bg: 'bg-amber-50 dark:bg-amber-950',     border: 'border-amber-200 dark:border-amber-800',     text: 'text-amber-800 dark:text-amber-200',     icon_color: 'text-amber-500'   },
  info:    { icon: Info,        bg: 'bg-blue-50 dark:bg-blue-950',       border: 'border-blue-200 dark:border-blue-800',       text: 'text-blue-800 dark:text-blue-200',       icon_color: 'text-blue-500'    },
}

const positionMap: Record<ToastPosition, string> = {
  'top-right':    'top-4 right-4',
  'top-left':     'top-4 left-4',
  'top-center':   'top-4 left-1/2 -translate-x-1/2',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left':  'bottom-4 left-4',
}

const DefaultToastItem: React.FC<{ toast: ToastItem; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const config = toastConfig[toast.type]
  const Icon = config.icon
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`flex items-start gap-3 w-80 px-4 py-3.5 rounded-xl border shadow-lg shadow-black/5 ${config.bg} ${config.border}`}
    >
      <Icon size={18} className={`flex-shrink-0 mt-0.5 ${config.icon_color}`} />
      <p className={`flex-1 text-sm font-medium leading-snug ${config.text}`}>{toast.message}</p>
      <button onClick={() => onDismiss(toast.id)} className={`flex-shrink-0 mt-0.5 ${config.text} opacity-60 hover:opacity-100 transition-opacity`}>
        <X size={14} />
      </button>
    </motion.div>
  )
}

export const ToastProvider: React.FC<{
  children:        React.ReactNode
  position?:       ToastPosition
  defaultDuration?: number
  // v5: render slot — full custom toast rendering
  renderToast?: (toast: ToastItem & { onClose: () => void }) => React.ReactNode
}> = ({ children, position = 'top-right', defaultDuration = 3000, renderToast }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) { clearTimeout(timer); timers.current.delete(id) }
  }, [])

  const add = useCallback((type: ToastType, message: string, duration?: number) => {
    const id  = Math.random().toString(36).slice(2)
    const dur = duration ?? defaultDuration
    setToasts(prev => [...prev, { id, type, message, duration: dur }])
    if (dur > 0) {
      const timer = setTimeout(() => dismiss(id), dur)
      timers.current.set(id, timer)
    }
  }, [defaultDuration, dismiss])

  const toast = {
    success: (msg: string, dur?: number) => add('success', msg, dur),
    error:   (msg: string, dur?: number) => add('error',   msg, dur),
    warning: (msg: string, dur?: number) => add('warning', msg, dur),
    info:    (msg: string, dur?: number) => add('info',    msg, dur),
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className={`fixed z-[100] flex flex-col gap-2 ${positionMap[position]}`}>
        <AnimatePresence mode="popLayout">
          {toasts.map(t =>
            renderToast
              ? <React.Fragment key={t.id}>{renderToast({ ...t, onClose: () => dismiss(t.id) })}</React.Fragment>
              : <DefaultToastItem key={t.id} toast={t} onDismiss={dismiss} />
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

export const Toast = ToastProvider
