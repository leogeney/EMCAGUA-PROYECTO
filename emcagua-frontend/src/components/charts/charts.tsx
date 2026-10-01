import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { CHART } from '../../data/constants'

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(ref.current)
    setW(ref.current.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

/** Ticks "limpios": 0, 500, 1.000 … */
function niceTicks(max: number, count = 4) {
  if (max <= 0) return { ticks: [0, 1], top: 1 }
  const raw = max / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!
  const top = Math.ceil(max / step) * step
  return { ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step), top }
}

/** Barra con extremo redondeado de 4px y base recta. */
function barPath(x: number, y: number, w: number, h: number, r = 4, roundTop = true) {
  if (h <= 0) return ''
  const rr = roundTop ? Math.min(r, h, w / 2) : 0
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`
}

type TooltipRow = { color?: string; label: string; value: string }

function Tooltip({ x, y, title, rows, width }: { x: number; y: number; title: string; rows: TooltipRow[]; width: number }) {
  const left = Math.min(Math.max(x, 80), width - 80)
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-dark text-white shadow-xl px-3 py-2 text-xs min-w-[140px]"
      style={{ left, top: y - 10 }}
    >
      <p className="font-semibold text-white/70 mb-1">{title}</p>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            {r.color && <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />}
            {r.label}
          </span>
          <span className="font-bold tabular-nums">{r.value}</span>
        </div>
      ))}
    </div>
  )
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Tarjeta de gráfico con vista de tabla                               */
/* ------------------------------------------------------------------ */

type ChartCardProps = {
  title: string
  subtitle?: string
  legend?: ReactNode
  table?: { columns: string[]; rows: (string | number)[][] }
  children: ReactNode
  className?: string
  action?: ReactNode
}

export function ChartCard({ title, subtitle, legend, table, children, className = '', action }: ChartCardProps) {
  const [vista, setVista] = useState<'grafico' | 'tabla'>('grafico')
  return (
    <section className={`card p-5 flex flex-col ${className}`}>
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold text-dark leading-tight">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {action}
          {table && (
            <div className="flex p-0.5 bg-gray-soft rounded-lg text-[11px] font-semibold">
              {(['grafico', 'tabla'] as const).map((v) => (
                <button key={v} onClick={() => setVista(v)} className={`px-2 h-6 rounded-md ${vista === v ? 'bg-white shadow-sm text-dark' : 'text-gray-500'}`}>
                  {v === 'grafico' ? 'Gráfico' : 'Tabla'}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>
      {legend && vista === 'grafico' && <div className="mb-3">{legend}</div>}
      <div className="flex-1">
        {vista === 'grafico' || !table ? (
          children
        ) : (
          <div className="max-h-72 overflow-auto rounded-xl border border-gray-100">
            <table className="w-full text-xs">
              <thead className="bg-gray-soft sticky top-0">
                <tr>{table.columns.map((c, i) => <th key={c} className={`px-3 py-2 font-semibold text-gray-500 ${i ? 'text-right' : 'text-left'}`}>{c}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {table.rows.map((r, i) => (
                  <tr key={i}>{r.map((c, j) => <td key={j} className={`px-3 py-1.5 ${j ? 'text-right tabular-nums' : 'text-dark font-medium'}`}>{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Área / línea con crosshair                                          */
/* ------------------------------------------------------------------ */

type AreaProps = {
  data: { label: string; full?: string; value: number }[]
  format: (n: number) => string
  axisFormat?: (n: number) => string
  height?: number
  color?: string
  name?: string
  refLine?: { value: number; label: string }
}

export function AreaChart({ data, format, axisFormat = format, height = 240, color = CHART.serie1, name = 'Valor', refLine }: AreaProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const m = { t: 16, r: 16, b: 28, l: 48 }
  const iw = Math.max(0, width - m.l - m.r)
  const ih = height - m.t - m.b
  const max = Math.max(...data.map((d) => d.value), refLine?.value ?? 0)
  const { ticks, top } = niceTicks(max * 1.05)
  const x = (i: number) => m.l + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw)
  const y = (v: number) => m.t + ih - (v / top) * ih
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.value)}`).join('')
  const area = `${line}L${x(data.length - 1)},${m.t + ih}L${x(0)},${m.t + ih}Z`
  const last = data.length - 1

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - r.left
    setHover(Math.max(0, Math.min(last, Math.round((px / r.width) * last))))
  }

  return (
    <div ref={ref} className="relative" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={name}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} stroke={CHART.grid} />
              <text x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-gray-400 text-[10px] tabular-nums">{axisFormat(t)}</text>
            </g>
          ))}
          {data.map((d, i) => (
            (data.length <= 12 || i % 2 === last % 2) && (
              <text key={d.label + i} x={x(i)} y={height - 8} textAnchor="middle" className={`text-[10px] ${hover === i ? 'fill-dark font-semibold' : 'fill-gray-400'}`}>{d.label}</text>
            )
          ))}
          {refLine && (
            <g>
              <line x1={m.l} x2={width - m.r} y1={y(refLine.value)} y2={y(refLine.value)} stroke={CHART.critico} strokeWidth={1} />
              <text x={width - m.r} y={y(refLine.value) - 5} textAnchor="end" className="fill-gray-500 text-[10px] font-medium">{refLine.label}</text>
            </g>
          )}
          <path d={area} fill={color} opacity={0.1} />
          <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={m.t + ih} stroke={CHART.eje} strokeWidth={1} />}
          <circle cx={x(hover ?? last)} cy={y(data[hover ?? last].value)} r={4.5} fill={color} stroke="#fff" strokeWidth={2} />
          {hover === null && (
            <text x={x(last) - 8} y={y(data[last].value) - 14} textAnchor="end" stroke="#fff" strokeWidth={4} paintOrder="stroke" strokeLinejoin="round" className="fill-dark text-[11px] font-bold tabular-nums">{format(data[last].value)}</text>
          )}
          <rect x={m.l} y={m.t} width={iw} height={ih} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
        </svg>
      )}
      {hover !== null && (
        <Tooltip x={x(hover)} y={y(data[hover].value)} width={width} title={data[hover].full ?? data[hover].label} rows={[{ color, label: name, value: format(data[hover].value) }]} />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Columnas (simple o apiladas)                                        */
/* ------------------------------------------------------------------ */

type ColumnProps = {
  data: { label: string; full?: string; values: number[]; colors?: string[] }[]
  series: { name: string; color: string }[]
  format: (n: number) => string
  axisFormat?: (n: number) => string
  height?: number
  showTotals?: boolean
}

export function ColumnChart({ data, series, format, axisFormat = format, height = 240, showTotals = false }: ColumnProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const m = { t: showTotals ? 22 : 12, r: 8, b: 28, l: 48 }
  const iw = Math.max(0, width - m.l - m.r)
  const ih = height - m.t - m.b
  const totals = data.map((d) => d.values.reduce((s, v) => s + v, 0))
  const { ticks, top } = niceTicks(Math.max(...totals))
  const band = iw / data.length
  const bw = Math.min(24, band * 0.62)
  const y = (v: number) => (v / top) * ih
  const GAP = 2

  return (
    <div ref={ref} className="relative" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={series.map((s) => s.name).join(' y ')}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={width - m.r} y1={m.t + ih - y(t)} y2={m.t + ih - y(t)} stroke={CHART.grid} />
              <text x={m.l - 8} y={m.t + ih - y(t)} dy="0.32em" textAnchor="end" className="fill-gray-400 text-[10px] tabular-nums">{axisFormat(t)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = m.l + band * i + band / 2
            let acc = 0
            const nonZero = d.values.map((v, k) => (v > 0 ? k : -1)).filter((k) => k >= 0)
            const topIdx = nonZero[nonZero.length - 1]
            return (
              <g key={d.label + i} opacity={hover === null || hover === i ? 1 : 0.45}>
                {d.values.map((v, k) => {
                  if (v <= 0) return null
                  const h = y(v)
                  const yTop = m.t + ih - acc - h
                  const isTop = k === topIdx
                  const gapBelow = acc > 0 ? GAP : 0
                  acc += h
                  return <path key={k} d={barPath(cx - bw / 2, yTop, bw, Math.max(0, h - gapBelow), 4, isTop)} fill={d.colors?.[k] ?? series[k].color} />
                })}
                {showTotals && totals[i] > 0 && (
                  <text x={cx} y={m.t + ih - y(totals[i]) - 6} textAnchor="middle" stroke="#fff" strokeWidth={3} paintOrder="stroke" className="fill-gray-600 text-[10px] font-semibold tabular-nums">{format(totals[i])}</text>
                )}
                <text x={cx} y={height - 8} textAnchor="middle" className={`text-[10px] ${hover === i ? 'fill-dark font-semibold' : 'fill-gray-400'}`}>{d.label}</text>
                <rect x={m.l + band * i} y={m.t} width={band} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
              </g>
            )
          })}
        </svg>
      )}
      {hover !== null && (
        <Tooltip
          x={m.l + band * hover + band / 2}
          y={m.t + ih - y(totals[hover])}
          width={width}
          title={data[hover].full ?? data[hover].label}
          rows={[
            ...series.map((s, k) => ({ color: data[hover].colors?.[k] ?? s.color, label: s.name, value: format(data[hover].values[k] ?? 0) })),
            ...(series.length > 1 ? [{ label: 'Total', value: format(totals[hover]) }] : []),
          ]}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Barras horizontales (ranking)                                       */
/* ------------------------------------------------------------------ */

type BarListProps = {
  data: { label: string; value: number; hint?: string; color?: string }[]
  format: (n: number) => string
  color?: string
  max?: number
}

export function BarList({ data, format, color = CHART.serie1, max }: BarListProps) {
  const top = max ?? Math.max(...data.map((d) => d.value), 1)
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.label} className="group" title={`${d.label}: ${format(d.value)}${d.hint ? ` · ${d.hint}` : ''}`}>
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <span className="text-sm text-dark font-medium truncate">{d.label}</span>
            <span className="text-sm font-bold text-dark tabular-nums shrink-0">
              {format(d.value)}
              {d.hint && <span className="ml-1.5 text-[11px] font-medium text-gray-400">{d.hint}</span>}
            </span>
          </div>
          <div className="h-2.5 rounded-r-[4px] bg-gray-soft overflow-hidden">
            <div className="h-full rounded-r-[4px] transition-all duration-500 group-hover:opacity-80" style={{ width: `${(d.value / top) * 100}%`, background: d.color ?? color }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/* ------------------------------------------------------------------ */
/* Sparkline                                                           */
/* ------------------------------------------------------------------ */

export function Sparkline({ values, color = CHART.serie1, height = 40 }: { values: number[]; color?: string; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const x = (i: number) => 4 + (i / Math.max(1, values.length - 1)) * (width - 8)
  const y = (v: number) => 4 + (1 - (v - min) / (max - min || 1)) * (height - 8)
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join('')
  return (
    <div ref={ref} style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} aria-hidden="true">
          <path d={`${d}L${x(values.length - 1)},${height}L${x(0)},${height}Z`} fill={color} opacity={0.1} />
          <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={3.5} fill={color} stroke="#fff" strokeWidth={2} />
        </svg>
      )}
    </div>
  )
}
