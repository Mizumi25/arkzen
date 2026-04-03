'use client'

// ============================================================
// ARKZEN ENGINE — SORTABLE LIST
// arkzen/core/components/SortableList.tsx
//
// Drag-and-drop reorderable list.
// Built on Pointer Events API — no external DnD library.
// Works on both mouse and touch.
//
// Usage:
//   <SortableList
//     items={tasks}
//     keyExtractor={t => t.id}
//     onReorder={setTasks}
//     renderItem={(item, { isDragging }) => <TaskCard task={item} />}
//   />
// ============================================================

import React, { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence }               from 'framer-motion'
import { GripVertical }                          from 'lucide-react'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface DragState {
  isDragging: boolean
  isOver:     boolean
}

interface SortableListProps<T> {
  items:          T[]
  keyExtractor:   (item: T) => string | number
  onReorder:      (newItems: T[]) => void
  renderItem:     (item: T, state: DragState) => React.ReactNode
  handle?:        boolean      // show drag handle (default: true)
  direction?:     'vertical' | 'horizontal'
  className?:     string
  itemClassName?: string
  disabled?:      boolean
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export function SortableList<T>({
  items,
  keyExtractor,
  onReorder,
  renderItem,
  handle      = true,
  direction   = 'vertical',
  className   = '',
  itemClassName = '',
  disabled    = false,
}: SortableListProps<T>) {

  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [overIdx,     setOverIdx]     = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // ─── Pointer Events drag logic ───────────────
  const onPointerDown = useCallback((e: React.PointerEvent, idx: number) => {
    if (disabled) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDraggingIdx(idx)
    setOverIdx(idx)
  }, [disabled])

  const onPointerEnter = useCallback((idx: number) => {
    if (draggingIdx === null) return
    setOverIdx(idx)
  }, [draggingIdx])

  const onPointerUp = useCallback(() => {
    if (draggingIdx === null || overIdx === null || draggingIdx === overIdx) {
      setDraggingIdx(null)
      setOverIdx(null)
      return
    }

    // Reorder
    const newItems = [...items]
    const [moved]  = newItems.splice(draggingIdx, 1)
    newItems.splice(overIdx, 0, moved)
    onReorder(newItems)

    setDraggingIdx(null)
    setOverIdx(null)
  }, [draggingIdx, overIdx, items, onReorder])

  const isHorizontal = direction === 'horizontal'

  return (
    <div
      ref={listRef}
      className={`${isHorizontal ? 'flex flex-row flex-wrap gap-3' : 'flex flex-col gap-2'} ${className}`}
    >
      <AnimatePresence initial={false}>
        {items.map((item, idx) => {
          const key        = keyExtractor(item)
          const isDragging = draggingIdx === idx
          const isOver     = overIdx === idx && draggingIdx !== null && draggingIdx !== idx

          return (
            <motion.div
              key={key}
              layout
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{
                opacity:   isDragging ? 0.5 : 1,
                scale:     isDragging ? 1.02 : 1,
                boxShadow: isDragging ? '0 8px 30px rgba(0,0,0,0.12)' : '0 0 0 rgba(0,0,0,0)',
                zIndex:    isDragging ? 50 : 'auto',
              }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={`
                relative select-none
                ${isOver ? 'ring-2 ring-neutral-900 dark:ring-white ring-offset-2 rounded-xl' : ''}
                ${itemClassName}
              `}
              onPointerEnter={() => onPointerEnter(idx)}
              onPointerUp={onPointerUp}
            >
              <div className="flex items-start gap-2">
                {/* Drag handle */}
                {handle && !disabled && (
                  <div
                    className="flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing text-neutral-300 hover:text-neutral-500 dark:hover:text-neutral-400 transition-colors touch-none"
                    onPointerDown={e => onPointerDown(e, idx)}
                  >
                    <GripVertical size={16} />
                  </div>
                )}

                {/* Item content */}
                <div className="flex-1 min-w-0">
                  {renderItem(item, { isDragging, isOver: overIdx === idx })}
                </div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}