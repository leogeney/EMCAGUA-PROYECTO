import type { ReactNode } from 'react'

type Props = {
  label: string
  value: ReactNode
  sub?: ReactNode
  delta?: { value: number; goodWhenUp: boolean; label: string; points?: boolean }
  icon?: ReactNode
  tone?: 'primary' | 'secondary' | 'danger' | 'warning'
  children?: ReactNode
}

const TONES = {
  primary: 'bg-primary/12 text-primary-700',
  secondary: 'bg-secondary/10 text-secondary',
  danger: 'bg-red-50 text-red-600',
  warning: 'bg-amber-50 text-amber-700',
}

export default function StatTile({ label, value, sub, delta, icon, tone = 'secondary', children }: Props) {
  const up = delta && delta.value >= 0
  const good = delta && (up === delta.goodWhenUp)
  return (
    <div className="card p-5 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold tracking-[0.1em] text-gray-400 uppercase">{label}</p>
        {icon && <span className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${TONES[tone]}`}>{icon}</span>}
      </div>
      <p className="text-[26px] font-extrabold tracking-tight text-dark leading-none mt-2 tabular-nums">{value}</p>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {delta && (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-md ${good ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {up ? '▲' : '▼'} {Math.abs(delta.value * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 })}{delta.points ? ' pts' : '%'}
          </span>
        )}
        {(sub || delta) && <span className="text-xs text-gray-500">{delta ? delta.label : sub}</span>}
      </div>
      {delta && sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}
