import { Link } from 'react-router-dom'
import { useData } from '../data/DataContext'
import { usePqr } from '../data/PqrContext'
import { ALARMAS } from '../data/telemetria'
import { diasHabilesRestantes } from '../data/pqr'
import { iso } from '../data/operacion'
import { balanceHidrico, IANC_META } from '../data/perdidas'
import { calendarioObligaciones } from '../data/nomina'
import { vencimientoPeriodo } from '../data/billing'
import { fechaLarga } from '../data/documentos'
import Ico from '../components/ui/Icon'
import { copCompacto, pct } from '../utils/format'
import { cuentaActual, getUsername } from '../utils/session'
import { useAlertas, I } from '../data/alertas'
import { useRecomendaciones } from '../data/recomendaciones'
import { PanelRecomendaciones } from '../components/asistente/Recomendaciones'

export default function MiDia() {
  const { usuarios, pagos, resumen, alarmas } = useData()
  const { pqrs } = usePqr()
  const hoy = new Date()
  const h = hoy.getHours()
  const saludo = h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches'

  // Números del día
  const hoyIso = iso(hoy)
  const pagosHoy = pagos.filter((p) => iso(new Date(p.timestamp)) === hoyIso)
  const abiertasPqr = pqrs.filter((p) => p.estado === 'Radicada' || p.estado === 'En trámite')
  const vencidas = abiertasPqr.filter((p) => diasHabilesRestantes(p.vence) < 0)
  const graves = alarmas.filter((a) => ALARMAS[a.tipo].grave)
  const morosos = usuarios.filter((u) => u.estado === 'Activo' && resumen(u).vencido)
  const balance = balanceHidrico(usuarios, 2)
  const ianc = balance[balance.length - 1]?.ianc ?? 0

  const recos = useRecomendaciones()
  // Lo que Gotita ya recomienda (mora, pérdidas, compras) no se repite en «Para atender»
  const items = useAlertas().filter((a) => !/^(mora|ianc|stock)-/.test(a.id))

  const agenda = [
    ...[0, 1].map((i) => { const d = new Date(hoy.getFullYear(), hoy.getMonth() - 1 + i, 1); return { fecha: vencimientoPeriodo(d.getMonth() + 1, d.getFullYear()), titulo: 'Vencimiento de facturas', detalle: 'Primer viernes del mes' } }),
    ...calendarioObligaciones(hoy).map((o) => ({ fecha: o.fecha, titulo: o.titulo, detalle: o.detalle })),
  ].filter((a) => { const d = (a.fecha.getTime() - hoy.getTime()) / 86_400_000; return d > -1 && d < 90 }).sort((a, b) => a.fecha.getTime() - b.fecha.getTime()).slice(0, 5)


  const color = { alta: 'border-l-red-500 bg-red-50/40', media: 'border-l-amber-400 bg-amber-50/30', info: 'border-l-secondary bg-white' }
  const iconoColor = { alta: 'bg-red-100 text-red-600', media: 'bg-amber-100 text-amber-700', info: 'bg-secondary/10 text-secondary' }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <p className="text-sm text-gray-500 first-letter:uppercase">{['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][hoy.getDay()]}, {fechaLarga(hoy)}</p>
        <h1 className="text-[28px] font-extrabold tracking-tight text-dark leading-tight">{saludo}, {cuentaActual()?.nombre.split(' ')[0] ?? getUsername()}</h1>
        <p className="text-sm text-gray-500 mt-1">{items.filter((i) => i.nivel === 'alta').length ? `Hay ${items.filter((i) => i.nivel === 'alta').length} asunto(s) urgente(s) para hoy.` : 'No hay nada urgente. Buen día para avanzar en lo pendiente.'}</p>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Num k="Recaudo de hoy" v={copCompacto(pagosHoy.reduce((s, p) => s + p.monto, 0))} sub={`${pagosHoy.length} pago(s)`} />
        <Num k="PQR abiertas" v={abiertasPqr.length} sub={`${vencidas.length} vencida(s)`} mal={vencidas.length > 0} />
        <Num k="Usuarios en mora" v={morosos.length} sub={copCompacto(morosos.reduce((s, u) => s + resumen(u).deuda, 0))} mal={morosos.length > 0} />
        <Num k="Alarmas de medidores" v={alarmas.length} sub={`${graves.length} grave(s)`} mal={graves.length > 0} />
        <Num k="Agua no contabilizada" v={pct(ianc, 0)} sub={`meta ${pct(IANC_META)}`} mal={ianc > IANC_META} />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5 items-start">
        <div className="space-y-6">
        <section>
          <h2 className="text-sm font-bold text-dark mb-3">Para atender</h2>
          {items.length === 0 ? (
            <div className="card p-10 text-center"><span className="mx-auto h-12 w-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mb-3"><Ico d={I.ok} className="w-6 h-6" /></span><p className="font-semibold text-dark">Todo al día</p></div>
          ) : (
            <div className="space-y-2.5">
              {items.map((it) => (
                <div key={it.titulo} className={`card border-l-4 ${color[it.nivel]} p-4 flex items-start gap-4`}>
                  <span className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${iconoColor[it.nivel]}`}><Ico d={it.icono} className="w-5 h-5" /></span>
                  <div className="flex-1 min-w-0"><p className="font-semibold text-dark">{it.titulo}</p><p className="text-sm text-gray-500 mt-0.5">{it.detalle}</p></div>
                  <Link to={it.to} className="btn-secondary h-9 text-sm shrink-0">{it.accion}</Link>
                </div>
              ))}
            </div>
          )}
        </section>
        <PanelRecomendaciones recos={recos} />
        </div>

        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="text-sm font-bold text-dark mb-3 flex items-center gap-2"><Ico d={I.cal} className="w-4 h-4" /> Próximas fechas</h2>
            <ul className="space-y-3">
              {agenda.map((a) => {
                const d = Math.ceil((a.fecha.getTime() - hoy.getTime()) / 86_400_000)
                return (
                  <li key={a.titulo + a.fecha.getTime()} className="flex gap-3">
                    <div className="h-11 w-11 rounded-xl bg-gray-soft flex flex-col items-center justify-center shrink-0"><span className="text-[10px] uppercase text-gray-400 leading-none">{a.fecha.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')}</span><span className="text-base font-extrabold text-dark leading-none">{a.fecha.getDate()}</span></div>
                    <div className="min-w-0"><p className="text-sm font-semibold text-dark">{a.titulo}</p><p className="text-xs text-gray-500">{a.detalle} · {d <= 0 ? 'hoy' : `en ${d} día(s)`}</p></div>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

function Num({ k, v, sub, mal }: { k: string; v: string | number; sub: string; mal?: boolean }) {
  return (
    <div className="card px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">{k}</p>
      <p className={`text-2xl font-extrabold tabular-nums ${mal ? 'text-red-600' : 'text-dark'}`}>{v}</p>
      <p className="text-xs text-gray-500">{sub}</p>
    </div>
  )
}
