import { useMemo, useState, type ReactNode } from 'react'
import { useData } from '../data/DataContext'
import { CHART } from '../data/constants'
import { medido, useConfig } from '../data/config'
import { AvisoSinMedidores } from '../components/ModoSinMedidores'
import { sectores, ubicacion, useZonas } from '../data/zonas'
import { lecturaMedidor, nombrePeriodo, resumenUsuario } from '../data/billing'
import { revisarLectura } from '../data/lecturas'
import { ALARMAS, alarmasDe, enLinea, type AlarmaMedidor, type Telemetria } from '../data/telemetria'
import type { Lectura, Usuario } from '../data/types'
import { ColumnChart } from '../components/charts/charts'
import Avatar from '../components/ui/Avatar'
import Drawer from '../components/ui/Drawer'
import Ico from '../components/ui/Icon'
import { useToast } from '../components/ui/Toast'
import { hora, num } from '../utils/format'
import { getUsername } from '../utils/session'

type Filtro = 'todos' | 'alarma' | 'caidos' | 'manual'

const D = {
  check: 'M5 13l4 4L19 7',
  warn: 'M12 9v3.75m0 3.75h.008M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  sync: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  wifi: 'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  drop: 'M12 21a7 7 0 007-7c0-4-7-11-7-11S5 10 5 14a7 7 0 007 7z',
  cam: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM15 13a3 3 0 11-6 0 3 3 0 016 0z',
  hand: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z',
}

/** "hace 5 min", "hace 3 h", "hace 2 días" */
function hace(ts: number, ahora: number) {
  const m = Math.max(0, Math.round((ahora - ts) / 60_000))
  if (m < 1) return 'ahora'
  if (m < 60) return `hace ${m} min`
  const h = Math.round(m / 60)
  return h < 48 ? `hace ${h} h` : `hace ${Math.round(h / 24)} días`
}

export default function Lecturas() {
  useZonas() // la lista de sectores se actualiza si cambia en Configuración
  const { usuarios, lecturas, periodoLectura, cierrePeriodo, medidores, alarmas, sincronizar, registrarLectura, borrarLectura } = useData()
  const toast = useToast()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [barrio, setBarrio] = useState('Todos')
  const [q, setQ] = useState('')
  const [abierto, setAbierto] = useState<string | null>(null)
  const [ahora, setAhora] = useState(() => Date.now())

  const conf = useConfig()
  const red = useMemo(() => usuarios.filter((u) => u.estado === 'Activo' && medido(u, conf)).sort((a, b) => a.sector.localeCompare(b.sector) || a.nombre.localeCompare(b.nombre)), [usuarios, conf])
  const cortados = usuarios.length - red.length
  const online = red.filter((u) => enLinea(medidores[u.id], ahora))
  const caidos = red.filter((u) => !enLinea(medidores[u.id], ahora))
  const remotas = red.filter((u) => lecturas[u.id]?.origen === 'telemetria').length
  const manuales = red.filter((u) => lecturas[u.id]?.origen === 'manual')
  const sinLectura = red.filter((u) => !lecturas[u.id])
  const conAlarma = new Set(alarmas.map((a) => a.usuario.id))
  const graves = alarmas.filter((a) => ALARMAS[a.tipo].grave)
  const perdidaFugas = alarmas.filter((a) => a.tipo === 'fuga').reduce((s, a) => s + Math.round((Math.min(...medidores[a.usuario.id].perfil24h.slice(1, 6)) * 24 * 30) / 1000), 0)
  const enLineaPct = red.length ? online.length / red.length : 0

  const visibles = red.filter((u) => {
    if (barrio !== 'Todos' && u.sector !== barrio) return false
    if (q && !`${u.nombre} ${u.medidor} ${u.id}`.toLowerCase().includes(q.toLowerCase())) return false
    if (filtro === 'alarma') return conAlarma.has(u.id)
    if (filtro === 'caidos') return !enLinea(medidores[u.id], ahora)
    if (filtro === 'manual') return lecturas[u.id]?.origen === 'manual'
    return true
  })

  const sync = async () => {
    const n = await sincronizar()
    setAhora(Date.now())
    toast('Medidores sincronizados', n ? `${n} lectura(s) nueva(s) recibida(s)` : `${online.length} medidores al día · ${caidos.length} sin comunicación`)
  }
  const sel = red.find((u) => u.id === abierto)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-primary-700 uppercase mb-2">Medidores inteligentes · {nombrePeriodo(periodoLectura.mes, periodoLectura.anio)}</p>
          <h1 className="text-[28px] font-extrabold tracking-tight text-dark leading-none">Lecturas automáticas</h1>
          <p className="text-sm text-gray-500 mt-2">Los medidores envían su lectura solos. Aquí revisas lo que llegó, las alarmas y los que no reportaron.</p>
        </div>
        <button onClick={sync} className="btn-secondary shrink-0"><Ico d={D.sync} /> Sincronizar</button>
      </div>

      <AvisoSinMedidores />

      <CierreMensual cierre={cierrePeriodo} periodo={nombrePeriodo(periodoLectura.mes, periodoLectura.anio)} ahora={ahora} conLectura={remotas + manuales.length} porPromedio={sinLectura.length} suspendidos={cortados} />

      {/* Indicadores */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <div className="card p-5 flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0">
            <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#eceeea" strokeWidth="4" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke={CHART.serie1} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${enLineaPct * 97.4} 97.4`} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-dark">{Math.round(enLineaPct * 100)}%</span>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">En línea</p>
            <p className="text-2xl font-extrabold text-dark tabular-nums">{online.length}<span className="text-sm font-semibold text-gray-400"> / {red.length}</span></p>
            <p className="text-xs text-gray-500 whitespace-nowrap">sincronizado {hora(ahora)}</p>
          </div>
        </div>
        <Tile label="Lecturas del periodo" value={`${red.length - sinLectura.length}`} sub={`${remotas} automáticas · ${manuales.length} en sitio · ${sinLectura.length} faltan`} />
        <Tile label="Alarmas activas" value={`${alarmas.length}`} sub={`${graves.length} requieren visita`} tone={graves.length ? 'text-red-600' : 'text-dark'} onClick={() => setFiltro('alarma')} />
        <Tile label="Agua perdida por fugas" value={`≈ ${num(perdidaFugas)} m³`} sub="al mes, según caudal nocturno" tone={perdidaFugas ? 'text-amber-700' : 'text-dark'} />
      </section>

      {/* Alarmas */}
      {alarmas.length > 0 && (
        <section className="card p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-dark">Requieren atención</h2>
            <span className="text-xs text-gray-400">Ordenadas por gravedad</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {alarmas.map((a, i) => <TarjetaAlarma key={`${a.usuario.id}-${a.tipo}-${i}`} a={a} onVer={() => setAbierto(a.usuario.id)} />)}
          </div>
        </section>
      )}

      {/* Filtros */}
      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <div className="flex p-1 bg-white border border-gray-100 rounded-xl shadow-sm overflow-x-auto">
          {([['todos', `Todos (${red.length})`], ['alarma', `Con alarma (${conAlarma.size})`], ['caidos', `Sin comunicación (${caidos.length})`], ['manual', `Lectura en sitio (${manuales.length})`]] as [Filtro, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)} className={`px-3 h-9 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${filtro === k ? 'bg-dark text-white' : 'text-gray-500 hover:text-dark'}`}>{l}</button>
          ))}
        </div>
        <select value={barrio} onChange={(e) => setBarrio(e.target.value)} className="field h-11 lg:w-48">
          <option value="Todos">Todos los sectores</option>
          {sectores().map((b) => <option key={b}>{b}</option>)}
        </select>
        <div className="relative flex-1">
          <Ico d={D.search} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o serial del medidor" className="field h-11 pl-10" />
        </div>
      </div>

      {/* Tabla de medidores */}
      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-soft/60 border-b border-gray-100">
              <tr><th className="th">Medidor</th><th className="th">Ubicación</th><th className="th text-right">Lectura</th><th className="th text-right">Consumo</th><th className="th">Comunicación</th><th className="th">Estado</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibles.map((u) => {
                const t = medidores[u.id]
                const l = lecturas[u.id]
                const al = alarmas.filter((a) => a.usuario.id === u.id)
                const ok = enLinea(t, ahora)
                return (
                  <tr key={u.id} onClick={() => setAbierto(u.id)} className="hover:bg-gray-soft/50 cursor-pointer">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <Avatar nombre={u.nombre} size={34} />
                        <div className="min-w-0">
                          <p className="font-semibold text-dark truncate">{u.nombre}</p>
                          <p className="text-xs text-gray-400 font-mono">{u.medidor}</p>
                        </div>
                      </div>
                    </td>
                    <td className="td text-gray-600">{ubicacion(u)}</td>
                    <td className="td text-right">
                      {l ? <><p className="font-mono font-semibold tabular-nums">{num(l.valor)}</p><p className="text-[11px] text-gray-400">{l.origen === 'manual' ? 'en sitio' : 'automática'}</p></> : <span className="text-xs text-gray-400 italic">sin lectura</span>}
                    </td>
                    <td className="td text-right font-semibold tabular-nums">{l ? `${Math.max(0, l.valor - lecturaMedidor(u))} m³` : <span className="text-gray-400 font-normal">≈ {num(resumenUsuario(u).consumoPromedio)} m³</span>}</td>
                    <td className="td whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${ok ? 'text-gray-600' : 'text-red-600'}`}>
                        <span className={`h-2 w-2 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />{hace(t.ultimaComunicacion, ahora)}
                      </span>
                    </td>
                    <td className="td">
                      {al.length === 0 ? <span className="badge-ok">Normal</span> : (
                        <span className="flex flex-wrap gap-1">{al.slice(0, 2).map((a) => <span key={a.tipo} className={ALARMAS[a.tipo].grave ? 'badge-bad' : 'badge-warn'}>{ALARMAS[a.tipo].label}</span>)}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {visibles.length === 0 && <p className="py-14 text-center text-sm text-gray-500">No hay medidores con ese filtro.</p>}
        <p className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">{cortados} medidores de usuarios con servicio cortado no se muestran.</p>
      </section>

      <Drawer open={!!sel} onClose={() => setAbierto(null)}>
        {sel && (
          <DetalleMedidor
            key={sel.id}
            u={sel}
            t={medidores[sel.id]}
            lectura={lecturas[sel.id]}
            ahora={ahora}
            onClose={() => setAbierto(null)}
            onGuardar={(l) => { registrarLectura(sel.id, l); toast('Lectura en sitio guardada', `${sel.nombre} · ${sel.medidor}`) }}
            onQuitar={() => { borrarLectura(sel.id); toast('Lectura manual eliminada', 'Si el medidor vuelve a reportar, se usará la lectura automática.') }}
          />
        )}
      </Drawer>

    </div>
  )
}

function Cifra({ n, t, c }: { n: number; t: string; c: string }) {
  return <div className={`rounded-xl px-3 py-2.5 ${c}`}><p className="text-xl font-extrabold tabular-nums leading-none">{n}</p><p className="text-xs mt-1">{t}</p></div>
}

/** Cuándo se facturan las lecturas de este mes y cómo quedaría cada usuario. */
function CierreMensual({ cierre, periodo, ahora, conLectura, porPromedio, suspendidos }: { cierre: Date; periodo: string; ahora: number; conLectura: number; porPromedio: number; suspendidos: number }) {
  const inicio = new Date(cierre); inicio.setMonth(inicio.getMonth() - 1)
  const avance = Math.min(1, Math.max(0, (ahora - inicio.getTime()) / (cierre.getTime() - inicio.getTime())))
  const dias = Math.max(0, Math.ceil((cierre.getTime() - ahora) / 86_400_000))
  const dia = (d: Date) => `${['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][d.getDay()]} ${d.getDate()} de ${d.toLocaleDateString('es-CO', { month: 'long' })}`
  const vence = new Date(cierre); vence.setDate(vence.getDate() + 14)
  return (
    <section className="card p-5 mb-5">
      <div className="flex flex-col lg:flex-row lg:items-center gap-5">
        <div className="flex items-center gap-4 lg:w-[400px] shrink-0">
          <span className="h-12 w-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0"><Ico d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" className="w-6 h-6" /></span>
          <div>
            <p className="text-sm text-gray-500">Las facturas de {periodo.toLowerCase()} se hacen solas el</p>
            <p className="text-lg font-extrabold text-dark first-letter:uppercase">{dia(cierre)}</p>
            <p className="text-xs text-gray-500">{dias === 0 ? 'Es hoy' : `Faltan ${dias} día(s)`} · el usuario tendrá hasta el {dia(vence)} para pagar</p>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-2">
          <Cifra n={conLectura} t="con lectura del medidor" c="bg-green-50 text-green-800" />
          <Cifra n={porPromedio} t="sin lectura: se cobra el promedio" c={porPromedio ? 'bg-amber-50 text-amber-800' : 'bg-gray-soft text-gray-600'} />
          <Cifra n={suspendidos} t="con servicio cortado" c="bg-gray-soft text-gray-600" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 text-[11px] text-gray-400">
        <span className="whitespace-nowrap">Avance del mes</span>
        <div className="flex-1 h-1.5 rounded-full bg-gray-soft overflow-hidden"><div className="h-full rounded-full bg-secondary" style={{ width: `${avance * 100}%` }} /></div>
        <span className="whitespace-nowrap">{Math.round(avance * 100)}%</span>
      </div>
      {porPromedio > 0 && <p className="text-xs text-gray-500 mt-2">Para que esos {porPromedio} no se cobren por promedio, toma la lectura en sitio antes de esa fecha (filtro «Sin comunicación»).</p>}
    </section>
  )
}

function Tile({ label, value, sub, tone = 'text-dark', onClick }: { label: string; value: string; sub: string; tone?: string; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={`card p-5 text-left ${onClick ? 'hover:border-gray-200 transition-colors' : ''}`}>
      <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">{label}</p>
      <p className={`text-2xl font-extrabold tabular-nums mt-1 ${tone}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
    </Tag>
  )
}

function TarjetaAlarma({ a, onVer }: { a: AlarmaMedidor; onVer: () => void }) {
  const g = ALARMAS[a.tipo].grave
  return (
    <button onClick={onVer} className={`text-left rounded-2xl border p-3.5 transition-colors hover:shadow-sm ${g ? 'border-red-100 bg-red-50/50 hover:border-red-200' : 'border-amber-100 bg-amber-50/40 hover:border-amber-200'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={g ? 'badge-bad' : 'badge-warn'}>{ALARMAS[a.tipo].label}</span>
        <span className="text-[11px] text-gray-400 font-mono">{a.usuario.medidor}</span>
      </div>
      <p className="font-semibold text-dark mt-2 truncate">{a.usuario.nombre} <span className="font-normal text-gray-400">· {ubicacion(a.usuario)}</span></p>
      <p className="text-xs text-gray-600 mt-0.5">{a.detalle}</p>
    </button>
  )
}

function DetalleMedidor({ u, t, lectura, ahora, onClose, onGuardar, onQuitar }: { u: Usuario; t: Telemetria; lectura?: Lectura; ahora: number; onClose: () => void; onGuardar: (l: Lectura) => void; onQuitar: () => void }) {
  const al = alarmasDe(u, t, lectura, ahora)
  const ok = enLinea(t, ahora)
  const anterior = lecturaMedidor(u)
  const [manual, setManual] = useState(!ok && !lectura)

  return (
    <>
      <header className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-start gap-3">
        <Avatar nombre={u.nombre} size={44} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 font-mono">{u.medidor} · {u.id}</p>
          <h2 className="text-lg font-bold text-dark truncate">{u.nombre}</h2>
          <p className="text-xs text-gray-500">{ubicacion(u)} · Estrato {u.estrato}</p>
        </div>
        <button onClick={onClose} className="h-9 w-9 rounded-xl text-gray-400 hover:text-dark hover:bg-gray-100 flex items-center justify-center" aria-label="Cerrar">✕</button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <div className="grid grid-cols-2 gap-2">
          <Dato k="Comunicación" v={<span className={`inline-flex items-center gap-1.5 ${ok ? '' : 'text-red-600'}`}><span className={`h-2 w-2 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />{hace(t.ultimaComunicacion, ahora)}</span>} />
          <Dato k="Señal" v={ok ? `${t.senal}%` : '—'} />
        </div>

        {al.length > 0 && (
          <div className="space-y-2">
            {al.map((a) => (
              <div key={a.tipo} className={`rounded-xl px-3.5 py-3 text-sm ${ALARMAS[a.tipo].grave ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900'}`}>
                <p className="font-semibold flex items-center gap-1.5"><Ico d={D.warn} className="w-4 h-4" /> {ALARMAS[a.tipo].label}</p>
                <p className="text-xs mt-1">{a.detalle}</p>
                <p className="text-xs mt-1 opacity-80">{ALARMAS[a.tipo].ayuda}</p>
              </div>
            ))}
          </div>
        )}

        <div>
          <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Lectura del periodo</p>
          {lectura ? (
            <div className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
              <div>
                <p className="font-mono text-xl font-extrabold text-dark tabular-nums">{num(lectura.valor)} <span className="text-sm text-gray-400">m³</span></p>
                <p className="text-xs text-gray-500">Anterior {num(anterior)} · consumo <b>{Math.max(0, lectura.valor - anterior)} m³</b> (prom. {num(resumenUsuario(u).consumoPromedio, 1)})</p>
                <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1"><Ico d={lectura.origen === 'manual' ? D.hand : D.wifi} className="w-3.5 h-3.5" />{lectura.origen === 'manual' ? `Tomada en sitio por ${lectura.lector}` : 'Enviada por el medidor'} · {hora(lectura.ts)}{lectura.foto && ' · con foto'}</p>
                {lectura.nota && <p className="text-xs text-gray-600 mt-1"><b>Nota:</b> {lectura.nota}</p>}
              </div>
              {lectura.origen === 'manual' && <button onClick={onQuitar} className="btn-sm">Quitar</button>}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">El medidor no ha enviado la lectura. Si no se registra antes del cierre, se factura por promedio (≈ {num(resumenUsuario(u).consumoPromedio)} m³).</p>
          )}
        </div>

        {ok && t.perfil24h.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Caudal de las últimas 24 horas (litros por hora)</p>
            <ColumnChart
              data={t.perfil24h.map((v, h) => ({ label: h % 3 === 0 ? `${h}h` : '', full: `${h}:00 – ${h + 1}:00`, values: [v], colors: [h >= 1 && h <= 5 && v >= 8 ? CHART.critico : CHART.serie1] }))}
              series={[{ name: 'Litros', color: CHART.serie1 }]}
              format={(n) => `${num(n)} L`}
              height={170}
            />
            <p className="text-xs text-gray-500 mt-1">De 1 a 5 a. m. lo normal es cero. Si hay barras rojas en la madrugada, el agua corre sin que nadie la use.</p>
          </div>
        )}

        {!manual && lectura?.origen !== 'manual' && (
          <button onClick={() => setManual(true)} className="btn-sm"><Ico d={D.hand} /> Registrar lectura en sitio</button>
        )}
        {manual && <FormManual u={u} onCancel={() => setManual(false)} onGuardar={(l) => { onGuardar(l); setManual(false) }} />}
      </div>
    </>
  )
}

function Dato({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="rounded-xl bg-gray-soft px-3 py-2.5">
      <p className="text-[11px] text-gray-500">{k}</p>
      <div className="text-sm font-semibold text-dark mt-0.5">{v}</div>
    </div>
  )
}

/** Respaldo cuando el medidor no comunica: un técnico va y lee el display. */
function FormManual({ u, onGuardar, onCancel }: { u: Usuario; onGuardar: (l: Lectura) => void; onCancel: () => void }) {
  const [valor, setValor] = useState('')
  const [nota, setNota] = useState('')
  const [foto, setFoto] = useState<string>()
  const n = Number(valor) || 0
  const rev = revisarLectura(u, n)
  const requiereNota = rev.nivel === 'aviso'
  const puede = n > 0 && rev.nivel !== 'error' && (!requiereNota || nota.trim().length > 2)
  const onFile = (f?: File) => { if (!f) return; const r = new FileReader(); r.onload = () => setFoto(r.result as string); r.readAsDataURL(f) }
  const guardar = () => puede && onGuardar({ valor: n, ts: Date.now(), lector: getUsername(), origen: 'manual', foto, nota: nota || undefined })

  return (
    <div className="rounded-2xl border border-gray-200 p-4 space-y-3">
      <div>
        <p className="font-semibold text-dark text-sm">Lectura en sitio</p>
        <p className="text-xs text-gray-500">Úsala solo si el medidor no comunica. Anterior: <span className="font-mono font-semibold">{num(lecturaMedidor(u))}</span> m³</p>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input autoFocus inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && guardar()} placeholder="Lectura del display" className={`field h-12 text-lg font-bold font-mono tabular-nums pr-12 ${rev.nivel === 'error' ? 'border-red-300' : ''}`} />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">m³</span>
        </div>
        <label className="h-12 w-12 rounded-xl border border-gray-200 hover:border-gray-300 flex items-center justify-center text-gray-500 cursor-pointer shrink-0" title="Foto del medidor">
          {foto ? <img src={foto} alt="" className="h-full w-full object-cover rounded-xl" /> : <Ico d={D.cam} className="w-5 h-5" />}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      </div>
      {n > 0 && (
        <p className={`rounded-xl px-3 py-2 text-sm ${rev.nivel === 'error' ? 'bg-red-50 text-red-700' : rev.nivel === 'aviso' ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-800'}`}>
          {rev.nivel !== 'error' && <b>Consumo: {rev.consumo} m³. </b>}{rev.mensaje}
        </p>
      )}
      {requiereNota && <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota obligatoria: ¿qué verificaste?" className="field text-sm" />}
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn-sm">Cancelar</button>
        <button disabled={!puede} onClick={guardar} className="btn-primary h-9 px-4 text-sm">Guardar lectura</button>
      </div>
    </div>
  )
}
