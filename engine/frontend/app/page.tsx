'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Layers, Play, Download, Clock,
  CheckCircle, AlertCircle, Plus, Terminal
} from 'lucide-react'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface TatemonoEntry {
  name: string
  version: string
  status: 'active' | 'inactive' | 'error'
  registered: string
  lastUpdated: string
}

interface RegistryData {
  engine: string
  project: string
  modules: TatemonoEntry[]
}

// ─────────────────────────────────────────────
// TATEMONO CARD
// ─────────────────────────────────────────────

const TatemonoCard = ({ tatemono, index }: { tatemono: TatemonoEntry; index: number }) => {
  const statusColor = {
    active:   'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
    inactive: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
    error:    'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
  }[tatemono.status]

  const StatusIcon = {
    active:   CheckCircle,
    inactive: Clock,
    error:    AlertCircle,
  }[tatemono.status]

  const routePath = `/${tatemono.name}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="group relative bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 p-6 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
      onClick={() => window.open(routePath, '_blank')}
    >
      {/* Status badge */}
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-4 ${statusColor}`}>
        <StatusIcon size={11} />
        {tatemono.status}
      </div>

      {/* Name */}
      <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-1 leading-tight">
        {tatemono.name}
      </h3>
      <p className="text-xs text-neutral-400 font-mono mb-4">v{tatemono.version}</p>

      {/* Meta */}
      <div className="text-xs text-neutral-400 space-y-1 mb-6">
        <div>Registered: {new Date(tatemono.registered).toLocaleDateString()}</div>
        <div>Updated: {new Date(tatemono.lastUpdated).toLocaleDateString()}</div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); window.open(routePath, '_blank') }}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-100 transition-colors"
        >
          <Play size={11} />
          Open
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(tatemono.name) }}
          className="px-3 py-2 text-xs font-medium rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
        >
          Copy
        </button>
      </div>

      {/* Hover glow */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-neutral-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </motion.div>
  )
}

// ─────────────────────────────────────────────
// MAIN HUB PAGE
// ─────────────────────────────────────────────

export default function ArkzenHub() {
  const [registry, setRegistry] = useState<RegistryData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRegistry()
    const interval = setInterval(fetchRegistry, 3000)
    return () => clearInterval(interval)
  }, [])

  const fetchRegistry = async () => {
    try {
      const res = await fetch('/api/arkzen/registry')
      if (res.ok) {
        const data = await res.json()
        setRegistry(data)
      }
    } catch {
      // Engine might still be starting
    } finally {
      setLoading(false)
    }
  }

  const active   = registry?.modules.filter(m => m.status === 'active').length ?? 0
  const total    = registry?.modules.length ?? 0
  const errors   = registry?.modules.filter(m => m.status === 'error').length ?? 0

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">

      {/* Header */}
      <div className="border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center">
              <span className="text-white dark:text-neutral-900 text-xs font-bold">A</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-neutral-900 dark:text-white">Arkzen Engine</h1>
              <p className="text-xs text-neutral-400">v{registry?.engine ?? '1.0.0'}</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-1.5 text-emerald-600">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium">Engine running</span>
            </div>
            <div className="text-xs text-neutral-400">
              {active} active · {total} total {errors > 0 ? `· ${errors} errors` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Active Tatemonos', value: active, icon: Layers, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950' },
            { label: 'Total Built', value: total, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950' },
            { label: 'Errors', value: errors, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 p-5 flex items-center gap-4"
            >
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon size={18} className={stat.color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-neutral-400">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Section header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
            Tatemonos
          </h2>
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Terminal size={12} />
            Drop a tatemono into engine/frontend/tatemono/ to build
          </div>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 p-6 h-48 animate-pulse" />
            ))}
          </div>
        ) : !registry || registry.modules.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24"
          >
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
              <Plus size={24} className="text-neutral-400" />
            </div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">
              No tatemonos yet
            </h3>
            <p className="text-sm text-neutral-400">
              Drop a tatemono file into engine/frontend/tatemono/
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {registry.modules.map((tatemono, i) => (
              <TatemonoCard key={tatemono.name} tatemono={tatemono} index={i} />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
