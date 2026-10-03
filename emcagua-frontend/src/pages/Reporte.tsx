import { useMemo, useState } from 'react'
import { useData } from '../data/DataContext'
import { usePqr } from '../data/PqrContext'
import { CHART } from '../data/constants'
import { consumosAtipicos, edadCartera, porBarrio, porEstrato, serieMensual } from '../data/analytics'
import { diasHabilesRestantes } from '../data/pqr'
import { ColumnChart, Legend } from '../components/charts/charts'
import Ico from '../components/ui/Icon'
import { cop, copCompacto, fecha, num, pct } from '../utils/format'
import { getUsername } from '../utils/session'

export default function Reporte() {
  const { usuarios, pagos } = useData()
  const { pqrs } = usePqr()
  const serieTodo = useMemo(() => serieMensual(usuarios, 12), [usuarios])
  const [idx, setIdx] = useState(serieTodo.length - 1)
  const [generado] = useState(() => Date.now())
  const p = serieTodo[idx]
  const ant = serieTodo[idx - 1]
  const serie = serieTodo.slice(Math.max(0, idx - 5), idx + 1)
  const barrios = porBarrio(usuarios)
  const estratos = porEstrato(usuarios)
  const cartera = edadCartera(usuarios)
  const atipicos = consumosAtipicos(usuarios).slice(0, 6)
  const delMes = pqrs.filter((x) => { const d = new Date(x.radicadaEn); return d.getMonth() + 1 === p.mes && d.getFullYear() === p.anio })
  const abiertas = pqrs.filter((x) => x.estado === 'Radicada' || x.estado === 'En trámite')
  const pagosMes = pagos.filter((x) => { const d = new Date(x.timestamp); return d.getMonth() + 1 === p.mes && d.getFullYear() === p.anio })
  const tasa = p.facturado ? p.recaudado / p.facturado : 0
  const delta = (a: number, b?: number) => (b ? `${a >= b ? '▲' : '▼'} ${pct(Math.abs(a / b - 1), 1)} vs mes anterior` : '')

  const kpis: [string, string, string][] = [
    ['Suscriptores', num(usuarios.length), `${usuarios.filter((u) => u.estado === 'Cortado').length} con servicio cortado`],
    ['Consumo', `${num(p.consumo)} m³`, delta(p.consumo, ant?.consumo)],
    ['Facturado', copCompacto(p.facturado), delta(p.facturado, ant?.facturado)],
    ['Recaudado', copCompacto(p.recaudado), `${pct(tasa, 1)} de lo facturado`],
    ['Cartera total', copCompacto(cartera.reduce((s, t) => s + t.monto, 0)), `${cartera.reduce((s, t) => s + t.facturas, 0)} facturas pendientes`],
    ['PQR abiertas', num(abiertas.length), `${abiertas.filter((x) => diasHabilesRestantes(x.vence) < 0).length} vencidas`],
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="no-print flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-primary-700 uppercase mb-2">Reportes</p>
          <h1 className="text-[28px] font-extrabold tracking-tight text-dark leading-none">Informe de gestión mensual</h1>
          <p className="text-sm text-gray-500 mt-2">Listo para imprimir o guardar en PDF y entregar a la gerencia.</p>
        </div>
        <div className="flex gap-2">
          <select value={idx} onChange={(e) => setIdx(Number(e.target.value))} className="field h-10 w-48">
            {serieTodo.map((s, i) => <option key={s.full} value={i}>{s.full}</option>)}
          </select>
          <button onClick={() => window.print()} className="btn bg-dark text-white hover:bg-black"><Ico d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /> Imprimir / PDF</button>
        </div>
      </div>

      <article className="print-area bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-10 space-y-8 text-sm">
        <header className="flex items-start justify-between gap-4 pb-6 border-b-2 border-secondary">
          <div className="flex items-center gap-3">
            <img src="/logo_circulo.png" alt="" className="h-14 w-14 object-contain" />
            <div>
              <p className="text-lg font-extrabold text-dark leading-none">EMCAGUA APC</p>
              <p className="text-xs text-gray-500 mt-1">Empresa de El Carmen y Guamalito · Administración Pública Cooperativa</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">Informe de gestión</p>
            <p className="text-xl font-extrabold text-secondary">{p.full}</p>
            <p className="text-[11px] text-gray-400">Generado {fecha(generado)} por {getUsername()}</p>
          </div>
        </header>

        <section>
          <h2 className="text-base font-bold text-dark mb-3">1. Indicadores principales</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {kpis.map(([k, v, s]) => (
              <div key={k} className="rounded-xl border border-gray-100 p-3">
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">{k}</p>
                <p className="text-xl font-extrabold text-dark tabular-nums mt-1">{v}</p>
                <p className="text-[11px] text-gray-500">{s}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold text-dark mb-1">2. Facturación y recaudo (últimos 6 meses)</h2>
          <div className="mb-2"><Legend items={[{ label: 'Recaudado', color: CHART.serie1 }, { label: 'Pendiente', color: CHART.serie2 }]} /></div>
          <ColumnChart data={serie.map((s) => ({ label: s.label, full: s.full, values: [s.recaudado, s.pendiente] }))} series={[{ name: 'Recaudado', color: CHART.serie1 }, { name: 'Pendiente', color: CHART.serie2 }]} format={copCompacto} axisFormat={(n) => `${num(n / 1_000_000, 1)}M`} height={200} />
          <table className="w-full text-xs mt-3">
            <thead><tr className="text-gray-500 border-b border-gray-200"><th className="text-left py-1.5">Periodo</th><th className="text-right">Consumo</th><th className="text-right">Facturado</th><th className="text-right">Recaudado</th><th className="text-right">% recaudo</th></tr></thead>
            <tbody>{serie.map((s) => <tr key={s.full} className="border-b border-gray-100"><td className="py-1.5">{s.full}</td><td className="text-right tabular-nums">{num(s.consumo)} m³</td><td className="text-right tabular-nums">{cop(s.facturado)}</td><td className="text-right tabular-nums">{cop(s.recaudado)}</td><td className="text-right tabular-nums">{pct(s.facturado ? s.recaudado / s.facturado : 0, 1)}</td></tr>)}</tbody>
          </table>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h2 className="text-base font-bold text-dark mb-2">3. Consumo y mora por barrio</h2>
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-gray-200"><th className="text-left py-1.5">Barrio</th><th className="text-right">Usuarios</th><th className="text-right">Prom. m³</th><th className="text-right">En mora</th></tr></thead>
              <tbody>{barrios.map((b) => <tr key={b.barrio} className="border-b border-gray-100"><td className="py-1.5">{b.barrio}</td><td className="text-right">{b.usuarios}</td><td className="text-right">{num(b.consumoPromedio, 1)}</td><td className="text-right">{b.morosos}</td></tr>)}</tbody>
            </table>
            <table className="w-full text-xs mt-3">
              <thead><tr className="text-gray-500 border-b border-gray-200"><th className="text-left py-1.5">Estrato</th><th className="text-right">Usuarios</th><th className="text-right">Morosidad</th><th className="text-right">Cartera</th></tr></thead>
              <tbody>{estratos.map((e) => <tr key={e.estrato} className="border-b border-gray-100"><td className="py-1.5">Estrato {e.estrato}</td><td className="text-right">{e.usuarios}</td><td className="text-right">{pct(e.morosidad, 1)}</td><td className="text-right">{cop(e.cartera)}</td></tr>)}</tbody>
            </table>
          </div>
          <div>
            <h2 className="text-base font-bold text-dark mb-2">4. Cartera por edad</h2>
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-gray-200"><th className="text-left py-1.5">Tramo</th><th className="text-right">Facturas</th><th className="text-right">Valor</th></tr></thead>
              <tbody>{cartera.map((t) => <tr key={t.label} className="border-b border-gray-100"><td className="py-1.5">{t.label}</td><td className="text-right">{t.facturas}</td><td className="text-right tabular-nums">{cop(t.monto)}</td></tr>)}</tbody>
            </table>
            <h2 className="text-base font-bold text-dark mt-5 mb-2">5. Atención al usuario (PQR)</h2>
            <ul className="text-xs space-y-1 text-gray-700">
              <li>Radicadas en el mes: <b>{delMes.length}</b></li>
              <li>Abiertas hoy: <b>{abiertas.length}</b> · vencidas: <b>{abiertas.filter((x) => diasHabilesRestantes(x.vence) < 0).length}</b></li>
              <li>Pagos registrados en el mes: <b>{pagosMes.length}</b> por <b>{cop(pagosMes.reduce((s, x) => s + x.monto, 0))}</b></li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold text-dark mb-2">6. Posibles fugas o errores de lectura</h2>
          {atipicos.length === 0 ? <p className="text-xs text-gray-500">No se detectaron consumos atípicos.</p> : (
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-gray-200"><th className="text-left py-1.5">Usuario</th><th className="text-left">Barrio</th><th className="text-right">Consumo</th><th className="text-right">Promedio</th><th className="text-right">Variación</th></tr></thead>
              <tbody>{atipicos.map((a) => <tr key={a.usuario.id} className="border-b border-gray-100"><td className="py-1.5">{a.usuario.nombre}</td><td>{a.usuario.barrio}</td><td className="text-right">{a.actual} m³</td><td className="text-right">{num(a.promedio, 1)} m³</td><td className="text-right font-semibold">+{pct(a.variacion)}</td></tr>)}</tbody>
            </table>
          )}
        </section>

        <section className="rounded-xl bg-gray-soft p-4">
          <h2 className="text-base font-bold text-dark mb-1">7. Conclusiones</h2>
          <p className="text-xs text-gray-700 leading-relaxed">
            En {p.full} se recaudó el {pct(tasa, 1)} de lo facturado. La cartera vencida suma {cop(cartera.slice(1).reduce((s, t) => s + t.monto, 0))}
            {cartera[4].facturas > 0 && `, con ${cop(cartera[4].monto)} de más de 90 días que conviene gestionar con acuerdos de pago`}.
            {atipicos.length > 0 && ` Se recomienda visitar a ${atipicos.length} usuario(s) con consumo atípico para descartar fugas.`}
            {abiertas.some((x) => diasHabilesRestantes(x.vence) < 0) && ' Hay PQR vencidas que deben responderse de inmediato para evitar el silencio administrativo positivo.'}
          </p>
        </section>

        <footer className="pt-6 grid grid-cols-2 gap-10 text-[11px] text-gray-400">
          <p className="border-t border-gray-300 pt-1">Elaboró</p>
          <p className="border-t border-gray-300 pt-1">Revisó · Gerencia</p>
        </footer>
      </article>
    </div>
  )
}
