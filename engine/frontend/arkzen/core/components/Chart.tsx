'use client'

// ============================================================
// ARKZEN ENGINE — CHART
// arkzen/core/components/Chart.tsx
//
// Custom SVG charts — no recharts, no external library.
// Supports: Line, Bar, Donut, Area
// ~10kb total, perfectly matches Arkzen design system.
//
// Usage:
//   <Chart type="bar" data={salesData} xKey="month" yKey="total" />
//   <Chart type="donut" data={statusData} labelKey="status" valueKey="count" />
// ============================================================

import React, { useMemo } from 'react'
import { motion }         from 'framer-motion'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface ChartDataPoint {
  [key: string]: string | number
}

interface ChartProps {
  type:       'line' | 'bar' | 'area' | 'donut'
  data:       ChartDataPoint[]
  xKey?:      string       // for line/bar/area
  yKey?:      string       // for line/bar/area
  labelKey?:  string       // for donut
  valueKey?:  string       // for donut
  color?:     string       // primary color (hex or tailwind)
  colors?:    string[]     // for donut slices
  height?:    number       // SVG height px
  showGrid?:  boolean
  showLabels?: boolean
  showDots?:  boolean      // for line charts
  className?: string
  title?:     string
  formatY?:   (v: number) => string
}

const DEFAULT_COLORS = ['#171717', '#525252', '#a3a3a3', '#d4d4d4', '#e5e5e5']
const PRIMARY = '#171717'

// ─────────────────────────────────────────────
// LINE / AREA CHART
// ─────────────────────────────────────────────

const LineChart: React.FC<{
  data: ChartDataPoint[]
  xKey: string
  yKey: string
  height: number
  color: string
  showGrid: boolean
  showDots: boolean
  isArea: boolean
  formatY: (v: number) => string
}> = ({ data, xKey, yKey, height, color, showGrid, showDots, isArea, formatY }) => {
  const W = 500
  const H = height
  const PAD = { top: 20, right: 20, bottom: 40, left: 48 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top  - PAD.bottom

  const values = data.map(d => Number(d[yKey]))
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const range  = maxVal - minVal || 1

  const toX = (i: number) => PAD.left + (i / (data.length - 1 || 1)) * innerW
  const toY = (v: number) => PAD.top + innerH - ((v - minVal) / range) * innerH

  const points = data.map((d, i) => ({ x: toX(i), y: toY(Number(d[yKey])), d }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].x},${PAD.top + innerH} L${PAD.left},${PAD.top + innerH} Z`

  const gridLines = 4
  const yLabels = Array.from({ length: gridLines + 1 }, (_, i) =>
    minVal + (range * i) / gridLines
  )

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      {/* Grid */}
      {showGrid && yLabels.map((v, i) => {
        const y = toY(v)
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y} stroke="#e5e5e5" strokeWidth={1} />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#a3a3a3">{formatY(v)}</text>
          </g>
        )
      })}

      {/* Area fill */}
      {isArea && (
        <motion.path
          d={areaPath}
          fill={color}
          fillOpacity={0.08}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        />
      )}

      {/* Line */}
      <motion.path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
      />

      {/* Dots */}
      {showDots && points.map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x} cy={p.y} r={3.5}
          fill="white" stroke={color} strokeWidth={2}
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ delay: 0.6 + i * 0.02 }}
        />
      ))}

      {/* X labels */}
      {points.map((p, i) => (
        <text key={i} x={p.x} y={H - 8} textAnchor="middle" fontSize={10} fill="#a3a3a3">
          {String(data[i][xKey]).slice(0, 6)}
        </text>
      ))}
    </svg>
  )
}

// ─────────────────────────────────────────────
// BAR CHART
// ─────────────────────────────────────────────

const BarChart: React.FC<{
  data: ChartDataPoint[]
  xKey: string
  yKey: string
  height: number
  color: string
  showGrid: boolean
  formatY: (v: number) => string
}> = ({ data, xKey, yKey, height, color, showGrid, formatY }) => {
  const W = 500
  const H = height
  const PAD = { top: 20, right: 20, bottom: 40, left: 48 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top  - PAD.bottom

  const values = data.map(d => Number(d[yKey]))
  const maxVal = Math.max(...values, 1)
  const barW   = (innerW / data.length) * 0.6
  const gap    = innerW / data.length

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      {showGrid && [0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = PAD.top + innerH - t * innerH
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y} stroke="#e5e5e5" strokeWidth={1} />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#a3a3a3">{formatY(maxVal * t)}</text>
          </g>
        )
      })}

      {data.map((d, i) => {
        const val  = Number(d[yKey])
        const barH = (val / maxVal) * innerH
        const x    = PAD.left + gap * i + gap / 2 - barW / 2
        const y    = PAD.top + innerH - barH

        return (
          <g key={i}>
            <motion.rect
              x={x} y={y} width={barW} height={barH}
              fill={color} rx={4} ry={4}
              initial={{ scaleY: 0, originY: 1 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: i * 0.05, duration: 0.4, ease: 'easeOut' }}
              style={{ transformOrigin: `0 ${PAD.top + innerH}px` }}
            />
            <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize={10} fill="#a3a3a3">
              {String(d[xKey]).slice(0, 6)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─────────────────────────────────────────────
// DONUT CHART
// ─────────────────────────────────────────────

const DonutChart: React.FC<{
  data: ChartDataPoint[]
  labelKey: string
  valueKey: string
  colors: string[]
  height: number
}> = ({ data, labelKey, valueKey, colors, height }) => {
  const total = data.reduce((s, d) => s + Number(d[valueKey]), 0)
  const CX = 120, CY = height / 2, R = 80, INNER = 52
  let startAngle = -Math.PI / 2

  const slices = data.map((d, i) => {
    const val    = Number(d[valueKey])
    const angle  = (val / total) * 2 * Math.PI
    const x1     = CX + R * Math.cos(startAngle)
    const y1     = CY + R * Math.sin(startAngle)
    const x2     = CX + R * Math.cos(startAngle + angle)
    const y2     = CY + R * Math.sin(startAngle + angle)
    const large  = angle > Math.PI ? 1 : 0
    const ix1    = CX + INNER * Math.cos(startAngle)
    const iy1    = CY + INNER * Math.sin(startAngle)
    const ix2    = CX + INNER * Math.cos(startAngle + angle)
    const iy2    = CY + INNER * Math.sin(startAngle + angle)
    const path   = `M${ix1},${iy1} L${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} L${ix2},${iy2} A${INNER},${INNER} 0 ${large},0 ${ix1},${iy1} Z`
    const pct    = Math.round((val / total) * 100)
    const color  = colors[i % colors.length]
    startAngle  += angle
    return { path, color, label: String(d[labelKey]), pct, val }
  })

  return (
    <svg viewBox={`0 0 500 ${height}`} className="w-full" style={{ height }}>
      {slices.map((s, i) => (
        <motion.path
          key={i} d={s.path} fill={s.color}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: i * 0.08 }}
        />
      ))}

      {/* Center label */}
      <text x={CX} y={CY - 4}  textAnchor="middle" fontSize={18} fontWeight="700" fill="#171717">{total}</text>
      <text x={CX} y={CY + 14} textAnchor="middle" fontSize={10} fill="#a3a3a3">total</text>

      {/* Legend */}
      {slices.map((s, i) => (
        <g key={i} transform={`translate(260, ${20 + i * 28})`}>
          <rect width={10} height={10} rx={2} fill={s.color} />
          <text x={16} y={9} fontSize={11} fill="#525252">{s.label}</text>
          <text x={200} y={9} textAnchor="end" fontSize={11} fontWeight="600" fill="#171717">{s.pct}%</text>
        </g>
      ))}
    </svg>
  )
}

// ─────────────────────────────────────────────
// MAIN CHART COMPONENT
// ─────────────────────────────────────────────

export const Chart: React.FC<ChartProps> = ({
  type,
  data,
  xKey        = 'x',
  yKey        = 'y',
  labelKey    = 'label',
  valueKey    = 'value',
  color       = PRIMARY,
  colors      = DEFAULT_COLORS,
  height      = 240,
  showGrid    = true,
  showLabels  = true,
  showDots    = true,
  className   = '',
  title,
  formatY     = (v) => String(Math.round(v)),
}) => {
  return (
    <div className={`${className}`}>
      {title && <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">{title}</p>}
      {type === 'line' && (
        <LineChart data={data} xKey={xKey} yKey={yKey} height={height} color={color} showGrid={showGrid} showDots={showDots} isArea={false} formatY={formatY} />
      )}
      {type === 'area' && (
        <LineChart data={data} xKey={xKey} yKey={yKey} height={height} color={color} showGrid={showGrid} showDots={showDots} isArea={true} formatY={formatY} />
      )}
      {type === 'bar' && (
        <BarChart data={data} xKey={xKey} yKey={yKey} height={height} color={color} showGrid={showGrid} formatY={formatY} />
      )}
      {type === 'donut' && (
        <DonutChart data={data} labelKey={labelKey} valueKey={valueKey} colors={colors} height={height} />
      )}
    </div>
  )
}