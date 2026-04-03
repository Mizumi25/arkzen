'use client'

// ============================================================
// ARKZEN ENGINE — UTILITY COMPONENTS v5.0
// Added render slots to: Breadcrumb, Badge, Avatar,
// EmptyState, Loading, Pagination, Field, Form
// ============================================================

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Home, Loader2, PackageOpen } from 'lucide-react'
import Link from 'next/link'

// ─────────────────────────────────────────────
// BREADCRUMB
// ─────────────────────────────────────────────

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface BreadcrumbProps {
  items:       BreadcrumbItem[]
  separator?:  '/' | '>' | '→'
  showHome?:   boolean
  // v5 render slots
  renderItem?: (item: BreadcrumbItem, index: number, isLast: boolean) => React.ReactNode
  renderSeparator?: () => React.ReactNode
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items, separator = '/', showHome = true, renderItem, renderSeparator,
}) => {
  const allItems = showHome ? [{ label: 'Home', href: '/' }, ...items] : items

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      {allItems.map((item, idx) => {
        const isLast = idx === allItems.length - 1
        return (
          <React.Fragment key={idx}>
            {idx > 0 && (
              renderSeparator
                ? renderSeparator()
                : <span className="text-neutral-300 dark:text-neutral-600 select-none">{separator}</span>
            )}
            {renderItem ? renderItem(item, idx, isLast) : (
              item.href && !isLast ? (
                <Link href={item.href} className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors">
                  {idx === 0 && showHome ? <Home size={14} /> : item.label}
                </Link>
              ) : (
                <span className="text-neutral-900 dark:text-neutral-100 font-medium">{item.label}</span>
              )
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}

// ─────────────────────────────────────────────
// BADGE
// ─────────────────────────────────────────────

export interface BadgeProps {
  label:    string
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info' | 'neutral'
  size?:    'sm' | 'md'
  dot?:     boolean
  // v5 render slot
  renderContent?: (label: string) => React.ReactNode
}

const badgeVariants = {
  default: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  error:   'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  info:    'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  neutral: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
}
const dotColors = {
  default: 'bg-neutral-400', success: 'bg-emerald-500', error: 'bg-red-500',
  warning: 'bg-amber-500', info: 'bg-blue-500', neutral: 'bg-neutral-400',
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'default', size = 'sm', dot = false, renderContent }) => (
  <span className={`inline-flex items-center gap-1.5 font-medium rounded-full ${size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'} ${badgeVariants[variant]}`}>
    {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
    {renderContent ? renderContent(label) : label}
  </span>
)

// ─────────────────────────────────────────────
// AVATAR
// ─────────────────────────────────────────────

export interface AvatarProps {
  name?: string
  src?:  string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  // v5 render slot
  renderFallback?: (initials: string) => React.ReactNode
}

const avatarSizes  = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-lg' }
const avatarColors = ['bg-violet-100 text-violet-700','bg-blue-100 text-blue-700','bg-emerald-100 text-emerald-700','bg-amber-100 text-amber-700','bg-rose-100 text-rose-700']

export const Avatar: React.FC<AvatarProps> = ({ name, src, size = 'md', renderFallback }) => {
  const initials  = name ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?'
  const colorIdx  = name ? name.charCodeAt(0) % avatarColors.length : 0

  if (src) return <img src={src} alt={name} className={`${avatarSizes[size]} rounded-full object-cover ring-2 ring-white dark:ring-neutral-900`} />

  if (renderFallback) return <>{renderFallback(initials)}</>

  return (
    <div className={`${avatarSizes[size]} rounded-full flex items-center justify-center font-semibold ring-2 ring-white dark:ring-neutral-900 ${avatarColors[colorIdx]}`}>
      {initials}
    </div>
  )
}

// ─────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────

export interface EmptyStateProps {
  title:        string
  description?: string
  action?:      React.ReactNode
  icon?:        React.ReactNode
  // v5 render slots
  renderIcon?:    () => React.ReactNode
  renderTitle?:   (title: string) => React.ReactNode
  renderContent?: (title: string, description?: string) => React.ReactNode
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action, icon, renderIcon, renderTitle, renderContent }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
      {renderIcon ? renderIcon() : (icon ?? <PackageOpen size={24} className="text-neutral-400" />)}
    </div>
    {renderContent ? renderContent(title, description) : (
      <>
        {renderTitle ? renderTitle(title) : (
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">{title}</h3>
        )}
        {description && <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs">{description}</p>}
      </>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
)

// ─────────────────────────────────────────────
// LOADING
// ─────────────────────────────────────────────

export interface LoadingProps {
  size?:     'sm' | 'md' | 'lg'
  label?:    string
  fullPage?: boolean
  // v5 render slot
  renderSpinner?: () => React.ReactNode
}

const loadingSizes = { sm: 14, md: 20, lg: 28 }

export const Loading: React.FC<LoadingProps> = ({ size = 'md', label, fullPage = false, renderSpinner }) => {
  const inner = (
    <div className="flex flex-col items-center gap-3">
      {renderSpinner ? renderSpinner() : <Loader2 size={loadingSizes[size]} className="text-neutral-400 animate-spin" />}
      {label && <p className="text-sm text-neutral-500">{label}</p>}
    </div>
  )

  if (fullPage) return (
    <div className="fixed inset-0 flex items-center justify-center bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm z-50">
      {inner}
    </div>
  )

  return <div className="flex items-center justify-center p-8">{inner}</div>
}

// ─────────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────────

export interface PaginationProps {
  currentPage:  number
  lastPage:     number
  onPageChange: (page: number) => void
  showCount?:   boolean
  total?:       number
  // v5 render slots
  renderPageButton?: (page: number | '...', isActive: boolean, onClick: () => void) => React.ReactNode
  renderControls?:   (prev: () => void, next: () => void, canPrev: boolean, canNext: boolean) => React.ReactNode
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage, lastPage, onPageChange, showCount = true, total, renderPageButton, renderControls,
}) => {
  if (lastPage <= 1) return null

  const pages: (number | '...')[] = []
  if (lastPage <= 7) {
    for (let i = 1; i <= lastPage; i++) pages.push(i)
  } else {
    pages.push(1)
    if (currentPage > 3) pages.push('...')
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(lastPage - 1, currentPage + 1); i++) pages.push(i)
    if (currentPage < lastPage - 2) pages.push('...')
    pages.push(lastPage)
  }

  return (
    <div className="flex items-center justify-between">
      {showCount && total != null && (
        <p className="text-sm text-neutral-500">Page {currentPage} of {lastPage} · {total} total</p>
      )}
      <div className="flex items-center gap-1 ml-auto">
        {renderControls ? renderControls(
          () => onPageChange(currentPage - 1),
          () => onPageChange(currentPage + 1),
          currentPage > 1,
          currentPage < lastPage,
        ) : (
          <>
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft size={16} />
            </button>
            {pages.map((page, idx) => (
              renderPageButton ? (
                <React.Fragment key={idx}>{renderPageButton(page, page === currentPage, () => typeof page === 'number' && onPageChange(page))}</React.Fragment>
              ) : page === '...' ? (
                <span key={`dots-${idx}`} className="px-2 text-neutral-400 text-sm">…</span>
              ) : (
                <button key={page} onClick={() => onPageChange(page as number)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>
                  {page}
                </button>
              )
            ))}
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === lastPage} className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// TOOLTIP
// ─────────────────────────────────────────────

export interface TooltipProps {
  content:  string
  children: React.ReactNode
  side?:    'top' | 'bottom' | 'left' | 'right'
  // v5 render slot
  renderTooltip?: (content: string) => React.ReactNode
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, side = 'top', renderTooltip }) => {
  const [visible, setVisible] = useState(false)
  const posMap = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2', bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <div className="relative inline-flex" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }} transition={{ duration: 0.12 }}
            className={`absolute z-50 pointer-events-none ${posMap[side]}`}
          >
            {renderTooltip ? renderTooltip(content) : (
              <span className="px-2.5 py-1.5 text-xs font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg whitespace-nowrap">
                {content}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────
// PAGE TRANSITION
// ─────────────────────────────────────────────

export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
    {children}
  </motion.div>
)

// ─────────────────────────────────────────────
// FORM + FIELD
// ─────────────────────────────────────────────

export interface FieldProps {
  label:     string
  error?:    string
  required?: boolean
  hint?:     string
  children:  React.ReactNode
  // v5 render slots
  renderLabel?: (label: string, required?: boolean) => React.ReactNode
  renderError?: (error: string) => React.ReactNode
}

export const Field: React.FC<FieldProps> = ({ label, error, required, hint, children, renderLabel, renderError }) => (
  <div className="flex flex-col gap-1.5">
    {renderLabel ? renderLabel(label, required) : (
      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
    )}
    {children}
    {hint && !error && <p className="text-xs text-neutral-400">{hint}</p>}
    {error && (renderError ? renderError(error) : <p className="text-xs text-red-500">{error}</p>)}
  </div>
)

export interface FormProps {
  onSubmit:   (e: React.FormEvent) => void
  children:   React.ReactNode
  className?: string
  // v5 render slot
  renderSubmit?: (onSubmit: (e: React.FormEvent) => void) => React.ReactNode
}

export const Form: React.FC<FormProps> = ({ onSubmit, children, className, renderSubmit }) => (
  <div className={className} onKeyDown={(e) => { if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.preventDefault() }}>
    {children}
    {renderSubmit ? renderSubmit(onSubmit) : (
      <button type="button" onClick={(e) => onSubmit(e as unknown as React.FormEvent)} className="hidden" />
    )}
  </div>
)
