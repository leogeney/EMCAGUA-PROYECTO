import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../data/DataContext'
import { serieMensual } from '../data/analytics'
import { UMBRAL_ALTO } from '../data/constants'
import { ColumnChart } from '../components/charts/charts'
import { CHART } from '../data/constants'
import StatTile from '../components/ui/StatTile'
import { formatCutoff, getNextCutoff } from '../utils/cutoff'
import { cop, copCompacto, fecha, hora, mismoDia, num } from '../utils/format'
import { getUsername } from '../utils/session'

const Icon = ({ d }: { d: string }) => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d} /></svg>
)

const ACCESOS = [
  { label: 'Nuevo usuario', to: '/usuarios?nuevo=1', d: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
  { label: 'Registrar pago', to: '/pagos', d: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
  { label: 'Ver facturación', to: '/facturacion', d: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
  { label: 'Analítica', to: '/analitica', d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
]

export default function Dashboard() {
  const { usuarios, pagos, facturas, resumen } = useData()
  const username = getUsername()
  const nextCutoff = getNextCutoff()
  const hoy = new Date()

  const serie = useMemo(() => serieMensual(usuarios, 12), [usuarios])
  const pagosHoy = pagos.filter((p) => mismoDia(p.timestamp, hoy))
  const cajaHoy = pagosHoy.reduce((s, p) => s + p.monto, 0)
  const pendientes = facturas.filter((f) => f.estado === 'Pendiente')
  const vencidos = usuarios.filter((u) => u.estado === 'Activo' && resumen(u).vencido)
  const cortados = usuarios.filter((u) => u.estado === 'Cortado').length
  const altos = usuarios.filter((u) => resumen(u).consumoActual > UMBRAL_ALTO).length
  const ult = serie[serie.length - 1]
  const ant = serie[serie.length - 2]
  const diasCorte = Math.ceil((nextCutoff.getTime() - hoy.getTime()) / 86_400_000)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-primary-700 uppercase mb-2">Panel de control</p>
          <h1 className="text-[28px] font-extrabold tracking-tight text-dark leading-none">Hola, {username}</h1>
          <p className="text-sm text-gray-500 mt-2 first-letter:uppercase">{hoy.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="card px-4 py-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-secondary text-white flex flex-col items-center justify-center leading-none">
            <span className="text-base font-extrabold">{diasCorte}</span>
            <span className="text-[8px] font-semibold uppercase tracking-wider">días</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-dark">Próximo corte · primer viernes</p>
            <p className="text-xs text-gray-500 first-letter:uppercase">{formatCutoff(nextCutoff)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatTile
          label="Usuarios"
          value={num(usuarios.length)}
          sub={`${usuarios.length - cortados} activos · ${cortados} cortados`}
          icon={<Icon d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />}
        />
        <StatTile
          label="Caja de hoy"
          value={copCompacto(cajaHoy)}
          sub={`${pagosHoy.length} pagos registrados`}
          tone="primary"
          icon={<Icon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
        />
        <StatTile
          label="Facturas pendientes"
          value={num(pendientes.length)}
          sub={`${cop(pendientes.reduce((s, f) => s + f.monto, 0))} por recaudar`}
          tone="warning"
          icon={<Icon d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />}
        />
        <StatTile
          label="Por cortar"
          value={num(vencidos.length)}
          sub={`Activos con factura vencida · ${altos} con consumo alto`}
          tone="danger"
          icon={<Icon d="M12 9v3.75m0 3.75h.008M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <section className="card p-5 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-bold text-dark">Recaudo últimos 12 meses</h3>
              <p className="text-xs text-gray-500 mt-1">Valor pagado de las facturas de cada periodo</p>
            </div>
            <Link to="/analitica" className="btn-sm no-underline">Ver analítica →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5">
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{ant?.full}</p>
              <p className="text-xl font-extrabold text-dark tabular-nums">{copCompacto(ant?.recaudado ?? 0)}</p>
              <p className="text-xs text-gray-500">{ant ? Math.round((ant.recaudado / Math.max(1, ant.facturado)) * 100) : 0}% recaudado</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{ult.full} · en curso</p>
              <p className="text-xl font-extrabold text-dark tabular-nums">{copCompacto(ult.recaudado)}</p>
              <p className="text-xs text-gray-500">de {copCompacto(ult.facturado)} facturado</p>
            </div>
            <div className="hidden sm:block">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Consumo {ult.label}</p>
              <p className="text-xl font-extrabold text-dark tabular-nums">{num(ult.consumo)} m³</p>
              <p className="text-xs text-gray-500">{num(ult.consumo / Math.max(1, ult.usuariosConsumo), 1)} m³ por usuario</p>
            </div>
          </div>
          <div className="mt-4">
            <ColumnChart
              data={serie.map((p) => ({ label: p.label, full: p.full, values: [p.recaudado] }))}
              series={[{ name: 'Recaudado', color: CHART.serie1 }]}
              format={copCompacto}
              axisFormat={(n) => (n >= 1_000_000 ? `${num(n / 1_000_000, 1)}M` : `${num(n / 1000)}k`)}
              height={190}
            />
          </div>
        </section>

        <section className="card p-5 flex flex-col">
          <h3 className="text-[15px] font-bold text-dark">Accesos rápidos</h3>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {ACCESOS.map((a) => (
              <Link key={a.label} to={a.to} className="group rounded-2xl border border-gray-100 bg-gray-soft hover:bg-primary/10 hover:border-primary/30 p-4 flex flex-col items-start gap-3 transition-colors no-underline">
                <span className="h-9 w-9 rounded-xl bg-white border border-gray-100 text-dark group-hover:bg-secondary group-hover:text-white group-hover:border-secondary flex items-center justify-center shadow-sm transition-colors">
                  <Icon d={a.d} />
                </span>
                <span className="text-xs font-semibold text-dark leading-tight">{a.label}</span>
              </Link>
            ))}
          </div>
          {vencidos.length > 0 && (
            <Link to="/usuarios?filtro=vencidos" className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 no-underline hover:bg-amber-100/60 transition-colors">
              <p className="text-xs font-bold text-amber-800">{vencidos.length} usuarios para corte</p>
              <p className="text-[11px] text-amber-800/80 mt-0.5">Pasó el primer viernes y siguen activos con deuda. Revisar →</p>
            </Link>
          )}
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-dark">Últimos pagos</h3>
          <Link to="/pagos" className="text-xs font-semibold text-secondary no-underline hover:underline">Ver todos →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-soft">
                <th className="th">Recibo</th>
                <th className="th">Cliente</th>
                <th className="th">Concepto</th>
                <th className="th text-right">Monto</th>
                <th className="th">Método</th>
                <th className="th">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagos.slice(0, 6).map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/60">
                  <td className="td font-mono text-xs font-semibold text-dark">{p.id}</td>
                  <td className="td font-medium text-dark whitespace-nowrap">{p.cliente}</td>
                  <td className="td text-gray-500 text-xs">{p.concepto}</td>
                  <td className="td text-right font-bold text-dark tabular-nums">{cop(p.monto)}</td>
                  <td className="td"><span className="badge-muted">{p.metodo}</span></td>
                  <td className="td text-xs text-gray-500 whitespace-nowrap">{mismoDia(p.timestamp, hoy) ? 'Hoy' : fecha(p.timestamp)} · {hora(p.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
