'use client'

// ============================================================
// ARKZEN ENGINE — TABLE COMPONENT v2.0
// arkzen/core/components/Table.tsx
//
// EXTENDS v1 — all existing slots still work exactly the same.
// Added:
//   - Column visibility toggles
//   - Per-column filter inputs
//   - Global search input
//   - All additions are opt-in (pass nothing = same as before)
// ============================================================

import React, { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, SlidersHorizontal, Search, X } from 'lucide-react'
import { EmptyState } from './EmptyState'
import { AnimatePresence, motion } from 'framer-motion'

// ─────────────────────────────────────────────
// TYPES — all v1 types preserved, new ones added
// ─────────────────────────────────────────────

export interface TableColumn<T> {
  key:        keyof T | string
  label:      string
  sortable?:  boolean
  filterable?: boolean           // NEW: show filter input for this column
  render?:    (value: unknown, row: T) => React.ReactNode
  width?:     string
  align?:     'left' | 'center' | 'right'
  hidden?:    boolean            // NEW: initial hidden state
}

export interface TableProps<T> {
  columns:    TableColumn<T>[]
  data:       T[]

  // ── Tier 2: Config ───────────────────────────
  loading?:          boolean
  striped?:          boolean
  hoverable?:        boolean
  border?:           'full' | 'row' | 'none'
  sortKey?:          string
  sortDir?:          'asc' | 'desc'
  onSort?:           (key: string) => void
  emptyTitle?:       string
  emptyDescription?: string
  rowKey?:           keyof T

  // ── NEW in v2.0 ──────────────────────────────
  searchable?:       boolean     // show global search input above table
  searchPlaceholder?: string
  columnToggles?:    boolean     // show column visibility toggle button
  filterable?:       boolean     // enable per-column filter inputs

  // ── Tier 3: Full slot overrides (all v1 slots preserved) ──
  renderRow?:      (row: T, index: number) => React.ReactNode
  renderHead?:     () => React.ReactNode
  renderEmpty?:    () => React.ReactNode
  renderSkeleton?: () => React.ReactNode
  renderToolbar?:  () => React.ReactNode   // NEW: replaces entire toolbar area
  className?:      string
  tableClassName?: string
  headerClassName?: string
}

// ─────────────────────────────────────────────
// SORT ICON
// ─────────────────────────────────────────────

const SortIcon: React.FC<{ col: string; sortKey?: string; sortDir?: 'asc' | 'desc' }> = ({
  col, sortKey, sortDir,
}) => {
  if (col !== sortKey) return <ChevronsUpDown size={14} className="text-neutral-300" />
  if (sortDir === 'asc') return <ChevronUp size={14} className="text-neutral-700 dark:text-neutral-300" />
  return <ChevronDown size={14} className="text-neutral-700 dark:text-neutral-300" />
}

// ─────────────────────────────────────────────
// SKELETON ROW
// ─────────────────────────────────────────────

const SkeletonRow: React.FC<{ cols: number }> = ({ cols }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
      </td>
    ))}
  </tr>
)

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  loading          = false,
  striped          = true,
  hoverable        = true,
  border           = 'row',
  sortKey,
  sortDir,
  onSort,
  emptyTitle       = 'No data',
  emptyDescription = 'Nothing to show here yet.',
  rowKey,
  searchable       = false,
  searchPlaceholder = 'Search...',
  columnToggles    = false,
  filterable       = false,
  renderRow,
  renderHead,
  renderEmpty,
  renderSkeleton,
  renderToolbar,
  className        = '',
  tableClassName   = '',
  headerClassName  = '',
}: TableProps<T>) {

  // ── Internal state ───────────────────────────
  const [search,          setSearch]          = useState('')
  const [columnFilters,   setColumnFilters]   = useState<Record<string, string>>({})
  const [hiddenColumns,   setHiddenColumns]   = useState<Set<string>>(
    () => new Set(columns.filter(c => c.hidden).map(c => String(c.key)))
  )
  const [showTogglePanel, setShowTogglePanel] = useState(false)

  // ── Visible columns ──────────────────────────
  const visibleColumns = useMemo(
    () => columns.filter(c => !hiddenColumns.has(String(c.key))),
    [columns, hiddenColumns]
  )

  // ── Filter + search data ─────────────────────
  const filteredData = useMemo(() => {
    let result = [...data]

    // Global search — searches all string values
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(row =>
        Object.values(row).some(v =>
          String(v ?? '').toLowerCase().includes(q)
        )
      )
    }

    // Per-column filters
    for (const [key, val] of Object.entries(columnFilters)) {
      if (!val.trim()) continue
      const q = val.toLowerCase()
      result = result.filter(row =>
        String(row[key] ?? '').toLowerCase().includes(q)
      )
    }

    return result
  }, [data, search, columnFilters])

  const getValue = (row: T, key: string): unknown =>
    key.split('.').reduce((acc: unknown, k) => {
      if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[k]
      return undefined
    }, row)

  const borderClass = {
    full: 'border border-neutral-200 dark:border-neutral-800',
    row:  '',
    none: '',
  }[border]

  const toggleColumn = (key: string) => {
    setHiddenColumns(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const clearColumnFilter = (key: string) => {
    setColumnFilters(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  return (
    <div className={`w-full space-y-3 ${className}`}>

      {/* ── TOOLBAR ─────────────────────────── */}
      {renderToolbar ? renderToolbar() : (searchable || columnToggles) && (
        <div className="flex items-center justify-between gap-3 flex-wrap">

          {/* Global search */}
          {searchable && (
            <div className="relative flex-1 min-w-48 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="arkzen-input pl-9 pr-8 py-2 text-sm w-full"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                  <X size={13} />
                </button>
              )}
            </div>
          )}

          {/* Column toggles */}
          {columnToggles && (
            <div className="relative">
              <button
                onClick={() => setShowTogglePanel(p => !p)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border border-neutral-200 dark:border-neutral-700"
              >
                <SlidersHorizontal size={14} />
                Columns
                {hiddenColumns.size > 0 && (
                  <span className="w-4 h-4 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs flex items-center justify-center font-semibold">
                    {hiddenColumns.size}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showTogglePanel && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 z-20 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg p-2 min-w-40"
                  >
                    {columns.map(col => (
                      <label key={String(col.key)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer text-sm text-neutral-700 dark:text-neutral-300">
                        <input
                          type="checkbox"
                          checked={!hiddenColumns.has(String(col.key))}
                          onChange={() => toggleColumn(String(col.key))}
                          className="w-3.5 h-3.5 rounded accent-neutral-900"
                        />
                        {col.label}
                      </label>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* ── TABLE ───────────────────────────── */}
      <div className={`w-full overflow-x-auto rounded-xl ${borderClass}`}>
        <table className={`w-full text-sm ${tableClassName}`}>

          {/* Head */}
          <thead>
            {renderHead ? renderHead() : (
              <>
                {/* Column headers */}
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  {visibleColumns.map(col => (
                    <th
                      key={String(col.key)}
                      style={col.width ? { width: col.width } : undefined}
                      className={`
                        px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400
                        ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}
                        ${col.sortable ? 'cursor-pointer select-none hover:text-neutral-900 dark:hover:text-neutral-100' : ''}
                        ${headerClassName}
                      `}
                      onClick={col.sortable && onSort ? () => onSort(String(col.key)) : undefined}
                    >
                      <div className={`flex items-center gap-1 ${col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : ''}`}>
                        {col.label}
                        {col.sortable && <SortIcon col={String(col.key)} sortKey={sortKey} sortDir={sortDir} />}
                      </div>
                    </th>
                  ))}
                </tr>

                {/* Per-column filter row */}
                {filterable && visibleColumns.some(c => c.filterable !== false) && (
                  <tr className="border-b border-neutral-100 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-900/50">
                    {visibleColumns.map(col => (
                      <td key={String(col.key)} className="px-2 py-1.5">
                        {col.filterable !== false && (
                          <div className="relative">
                            <input
                              type="text"
                              value={columnFilters[String(col.key)] ?? ''}
                              onChange={e => setColumnFilters(prev => ({ ...prev, [String(col.key)]: e.target.value }))}
                              placeholder={`Filter ${col.label.toLowerCase()}...`}
                              className="w-full text-xs px-2.5 py-1.5 pr-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 placeholder-neutral-300 focus:outline-none focus:border-neutral-400"
                            />
                            {columnFilters[String(col.key)] && (
                              <button
                                onClick={() => clearColumnFilter(String(col.key))}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-neutral-500"
                              >
                                <X size={11} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                )}
              </>
            )}
          </thead>

          {/* Body */}
          <tbody>
            {loading ? (
              renderSkeleton ? renderSkeleton() : (
                Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} cols={visibleColumns.length} />
                ))
              )
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length} className="py-16">
                  {renderEmpty ? renderEmpty() : (
                    <EmptyState title={emptyTitle} description={emptyDescription} />
                  )}
                </td>
              </tr>
            ) : (
              filteredData.map((row, rowIdx) => (
                renderRow ? (
                  <React.Fragment key={rowKey ? String(row[rowKey]) : rowIdx}>
                    {renderRow(row, rowIdx)}
                  </React.Fragment>
                ) : (
                  <tr
                    key={rowKey ? String(row[rowKey]) : rowIdx}
                    className={`
                      border-b border-neutral-100 dark:border-neutral-800/60 last:border-0
                      ${striped && rowIdx % 2 === 1 ? 'bg-neutral-50/50 dark:bg-neutral-800/20' : ''}
                      ${hoverable ? 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors' : ''}
                    `}
                  >
                    {visibleColumns.map(col => (
                      <td
                        key={String(col.key)}
                        className={`
                          px-4 py-3 text-neutral-700 dark:text-neutral-300
                          ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}
                        `}
                      >
                        {col.render
                          ? col.render(getValue(row, String(col.key)), row)
                          : String(getValue(row, String(col.key)) ?? '—')}
                      </td>
                    ))}
                  </tr>
                )
              ))
            )}
          </tbody>

        </table>
      </div>
    </div>
  )
}