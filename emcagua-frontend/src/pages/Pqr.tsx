import { useMemo, useState } from 'react'
import { useData } from '../data/DataContext'
import { usePqr } from '../data/PqrContext'
import { mensajeError } from '../data/api'
import { useNomina } from '../data/NominaContext'
import { CHART } from '../data/constants'
import { sectores, useZonas } from '../data/zonas'
import { PLANTILLAS, PLAZO_DIAS_HABILES, diasHabilesEntre, diasHabilesRestantes, sugerirCategoria, sumarDiasHabiles } from '../data/pqr'
import type { CategoriaPqr, EstadoPqr, Pqr, TipoPqr } from '../data/types'
import { BarList, ChartCard } from '../components/charts/charts'
import Modal, { ConfirmDialog } from '../components/ui/Modal'
import Drawer from '../components/ui/Drawer'
import StatTile from '../components/ui/StatTile'
import Ico from '../components/ui/Icon'
import { useToast } from '../components/ui/Toast'
import { fecha, fechaCorta, hora, num } from '../utils/format'

type Tab = 'abiertas' | 'respondidas' | 'cerradas' | 'todas'
const TIPOS: TipoPqr[] = ['Petición', 'Queja', 'Reclamo', 'Recurso', 'Sugerencia']
const CATEGORIAS: CategoriaPqr[] = ['Facturación', 'Daño o fuga', 'Calidad del agua', 'Corte y reconexión', 'Atención', 'Otro']
const abierta = (p: Pqr) => p.estado === 'Radicada' || p.estado === 'En trámite'

const D = {
  plus: 'M12 4v16m8-8H4',
  warn: 'M12 9v3.75m0 3.75h.008M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  x: 'M6 18L18 6M6 6l12 12',
  spark: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  send: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8',
}

function Semaforo({ p }: { p: Pqr }) {
  if (!abierta(p)) {
    const usados = p.respondidaEn ? diasHabilesEntre(p.radicadaEn, p.respondidaEn) : 0
    return <span className={usados <= PLAZO_DIAS_HABILES ? 'badge-ok' : 'badge-bad'}>{p.respondidaEn ? `Respondida en ${usados} d. háb.` : 'Cerrada'}</span>
  }
  const d = diasHabilesRestantes(p.vence)
  if (d < 0) return <span className="badge-bad">Vencida hace {-d} d. háb.</span>
  if (d <= 3) return <span className="badge-warn">{d === 0 ? 'Vence hoy' : `Quedan ${d} d. háb.`}</span>
  return <span className="badge-muted">Quedan {d} d. háb.</span>
}

const ESTADO_CLS: Record<EstadoPqr, string> = {
  Radicada: 'bg-blue-50 text-blue-700',
  'En trámite': 'bg-amber-50 text-amber-800',
  Respondida: 'bg-green-50 text-green-700',
  Cerrada: 'bg-gray-100 text-gray-600',
}

export default function PqrPage() {
  const { pqrs } = usePqr()
  const [tab, setTab] = useState<Tab>('abiertas')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<'Todas' | CategoriaPqr>('Todas')
  const [sel, setSel] = useState<string | null>(null)
  const [nueva, setNueva] = useState(false)

  const abiertas = pqrs.filter(abierta)
  const vencidas = abiertas.filter((p) => diasHabilesRestantes(p.vence) < 0)
  const porVencer = abiertas.filter((p) => { const d = diasHabilesRestantes(p.vence); return d >= 0 && d <= 3 })
  const respondidas = pqrs.filter((p) => p.respondidaEn)
  const promedio = respondidas.length ? respondidas.reduce((s, p) => s + diasHabilesEntre(p.radicadaEn, p.respondidaEn!), 0) / respondidas.length : 0

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase()
    return pqrs
      .filter((p) => (tab === 'abiertas' ? abierta(p) : tab === 'respondidas' ? p.estado === 'Respondida' : tab === 'cerradas' ? p.estado === 'Cerrada' : true))
      .filter((p) => cat === 'Todas' || p.categoria === cat)
      .filter((p) => !t || `${p.radicado} ${p.nombre} ${p.descripcion} ${p.suscriptorId ?? ''}`.toLowerCase().includes(t))
      .sort((a, b) => (abierta(a) && abierta(b) ? a.vence - b.vence : b.radicadaEn - a.radicadaEn))
  }, [pqrs, tab, q, cat])

  const zonas = useZonas()
  const porCategoria = CATEGORIAS.map((c) => ({ label: c, value: pqrs.filter((p) => p.categoria === c).length })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value)
  const porBarrio = zonas.map((z) => ({ label: z.nombre, value: pqrs.filter((p) => p.barrio === z.nombre).length })).sort((a, b) => b.value - a.value)
  const seleccionada = pqrs.find((p) => p.radicado === sel) ?? null

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-primary-700 uppercase mb-2">Atención al usuario</p>
          <h1 className="text-[28px] font-extrabold tracking-tight text-dark leading-none">PQR</h1>
          <p className="text-sm text-gray-500 mt-2">Peticiones, quejas, reclamos y recursos · plazo legal {PLAZO_DIAS_HABILES} días hábiles (Ley 142 de 1994, art. 158)</p>
        </div>
        <button onClick={() => setNueva(true)} className="btn-primary"><Ico d={D.plus} /> Radicar PQR</button>
      </div>

      {vencidas.length > 0 && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-white px-4 py-3 flex items-start gap-3">
          <span className="h-9 w-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0"><Ico d={D.warn} /></span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-dark">{vencidas.length} PQR vencida(s) sin respuesta</p>
            <p className="text-xs text-gray-600 mt-0.5">Si pasan {PLAZO_DIAS_HABILES} días hábiles sin respuesta, la ley la da por resuelta a favor del usuario (silencio administrativo positivo) y la empresa debe reconocerlo en 72 horas.</p>
          </div>
          <button onClick={() => setTab('abiertas')} className="btn-sm shrink-0">Ver</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatTile label="Abiertas" value={abiertas.length} sub={`${abiertas.filter((p) => p.estado === 'Radicada').length} sin asignar`} />
        <StatTile label="Por vencer" value={porVencer.length} sub="3 días hábiles o menos" tone="warning" />
        <StatTile label="Vencidas" value={vencidas.length} sub="Riesgo de silencio positivo" tone="danger" />
        <StatTile label="Tiempo de respuesta" value={`${num(promedio, 1)} días`} sub={`Promedio hábil · ${respondidas.length} respondidas`} tone="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="card overflow-hidden lg:col-span-2 h-fit">
          <div className="px-2 sm:px-4 border-b border-gray-100 flex flex-wrap">
            {([['abiertas', `Abiertas (${abiertas.length})`], ['respondidas', 'Respondidas'], ['cerradas', 'Cerradas'], ['todas', 'Todas']] as [Tab, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`relative px-3 h-12 text-sm font-semibold whitespace-nowrap ${tab === k ? 'text-dark' : 'text-gray-400 hover:text-gray-600'}`}>
                {l}
                {tab === k && <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-dark" />}
              </button>
            ))}
          </div>
          <div className="p-4 flex flex-col sm:flex-row gap-2 border-b border-gray-100 bg-gray-soft/40">
            <div className="relative flex-1">
              <Ico d={D.search} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Radicado, nombre o texto" className="field pl-10" />
            </div>
            <select value={cat} onChange={(e) => setCat(e.target.value as typeof cat)} className="field sm:w-52">
              <option>Todas</option>
              {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          {lista.length === 0 ? (
            <p className="py-14 text-center text-sm text-gray-400">No hay PQR en este filtro.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {lista.map((p) => (
                <li key={p.radicado} onClick={() => setSel(p.radicado)} className="px-4 sm:px-5 py-3.5 hover:bg-gray-soft/60 cursor-pointer">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-dark">{p.radicado}</span>
                    <span className="badge-muted">{p.tipo}</span>
                    <span className="text-xs text-gray-500">{p.categoria}</span>
                    <span className="ml-auto"><Semaforo p={p} /></span>
                  </div>
                  <p className="text-sm text-dark mt-1.5 line-clamp-1">{p.descripcion}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-400">
                    <span>{p.nombre} · {p.barrio}</span>
                    <span>Radicada {fechaCorta(new Date(p.radicadaEn))}</span>
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${ESTADO_CLS[p.estado]}`}>{p.estado}</span>
                    {p.responsable ? <span>→ {p.responsable}</span> : abierta(p) && <span className="text-amber-700 font-semibold">Sin responsable</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-5">
          <ChartCard title="PQR por categoría" subtitle={`${pqrs.length} radicadas`} table={{ columns: ['Categoría', 'PQR'], rows: porCategoria.map((c) => [c.label, c.value]) }}>
            <BarList data={porCategoria} format={(n) => num(n)} />
          </ChartCard>
          <ChartCard title="PQR por sector" table={{ columns: ['Sector', 'PQR'], rows: porBarrio.map((c) => [c.label, c.value]) }}>
            <BarList data={porBarrio} format={(n) => num(n)} color={CHART.serie2} />
          </ChartCard>
        </div>
      </div>

      {nueva && <NuevaPqrModal onClose={() => setNueva(false)} onCreada={(r) => { setNueva(false); setSel(r) }} />}
      <Drawer open={!!seleccionada} onClose={() => setSel(null)}>{seleccionada && <DetallePqr p={seleccionada} onClose={() => setSel(null)} />}</Drawer>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function NuevaPqrModal({ onClose, onCreada }: { onClose: () => void; onCreada: (radicado: string) => void }) {
  const { usuarios } = useData()
  const { radicar } = usePqr()
  const toast = useToast()
  const [busca, setBusca] = useState('')
  const [suscriptorId, setSuscriptorId] = useState<string | undefined>()
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [barrio, setBarrio] = useState<string>(sectores()[0] ?? '')
  const [tipo, setTipo] = useState<TipoPqr>('Reclamo')
  const [canal, setCanal] = useState<Pqr['canal']>('Presencial')
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] = useState<CategoriaPqr | null>(null)
  const sugerida = sugerirCategoria(descripcion)
  const catFinal = categoria ?? sugerida
  const coincidencias = busca.length >= 2 ? usuarios.filter((u) => `${u.nombre} ${u.id} ${u.medidor}`.toLowerCase().includes(busca.toLowerCase())).slice(0, 5) : []
  const vence = sumarDiasHabiles(new Date(), PLAZO_DIAS_HABILES)
  const valido = nombre.trim() && descripcion.trim().length >= 10

  const elegir = (id: string) => {
    const u = usuarios.find((x) => x.id === id)!
    setSuscriptorId(u.id); setNombre(u.nombre); setTelefono(u.telefono); setBarrio(u.sector); setBusca('')
  }

  const [enviando, setEnviando] = useState(false)
  const guardar = async () => {
    setEnviando(true)
    try {
      const p = await radicar({ tipo, categoria: catFinal, canal, suscriptorId, nombre, telefono, barrio, descripcion })
      toast('PQR radicada', `${p.radicado} · vence ${fechaCorta(new Date(p.vence))}`)
      onCreada(p.radicado)
    } catch (e) {
      toast('No se radicó la PQR', mensajeError(e), 'warning')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal open onClose={onClose} size="lg" title="Radicar PQR" subtitle={`Fecha límite de respuesta: ${fecha(vence)} (${PLAZO_DIAS_HABILES} días hábiles)`}
      footer={<><button onClick={onClose} className="btn-secondary flex-1">Cancelar</button><button disabled={!valido || enviando} onClick={guardar} className="btn-primary flex-1">{enviando ? 'Radicando…' : 'Radicar'}</button></>}>
      <div className="px-6 py-5 space-y-4">
        <div>
          <label className="field-label">Suscriptor</label>
          {suscriptorId ? (
            <div className="flex items-center justify-between rounded-xl bg-gray-soft px-3 py-2.5">
              <div><p className="text-sm font-semibold text-dark">{nombre}</p><p className="text-xs text-gray-500">ID {suscriptorId} · {barrio} · {telefono}</p></div>
              <button onClick={() => { setSuscriptorId(undefined); setNombre(''); setTelefono('') }} className="btn-sm">Cambiar</button>
            </div>
          ) : (
            <div className="relative">
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Busca por nombre, ID o medidor (o llena los datos abajo si no es suscriptor)" className="field" />
              {coincidencias.length > 0 && (
                <ul className="absolute z-10 left-0 right-0 mt-1 rounded-xl border border-gray-100 bg-white shadow-xl overflow-hidden">
                  {coincidencias.map((u) => (
                    <li key={u.id}><button onClick={() => elegir(u.id)} className="w-full text-left px-3 py-2 hover:bg-gray-soft text-sm"><b className="text-dark">{u.nombre}</b> <span className="text-gray-400">· {u.id} · {u.barrio}</span></button></li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        {!suscriptorId && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className="field-label">Nombre</label><input value={nombre} onChange={(e) => setNombre(e.target.value)} className="field" /></div>
            <div><label className="field-label">Teléfono</label><input value={telefono} onChange={(e) => setTelefono(e.target.value)} className="field" /></div>
            <div><label className="field-label">Sector</label><select value={barrio} onChange={(e) => setBarrio(e.target.value)} className="field">{sectores().map((b) => <option key={b}>{b}</option>)}</select></div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div><label className="field-label">Tipo</label><select value={tipo} onChange={(e) => setTipo(e.target.value as TipoPqr)} className="field">{TIPOS.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div><label className="field-label">Canal</label><select value={canal} onChange={(e) => setCanal(e.target.value as Pqr['canal'])} className="field">{['Presencial', 'Teléfono', 'WhatsApp', 'Correo'].map((t) => <option key={t}>{t}</option>)}</select></div>
        </div>
        <div>
          <label className="field-label">Descripción</label>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={4} placeholder="Escribe lo que reporta el usuario con sus palabras" className="field resize-none" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="field-label !mb-0">Categoría</label>
            {descripcion.length >= 10 && categoria === null && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-secondary"><Ico d={D.spark} className="w-3.5 h-3.5" /> Sugerida automáticamente</span>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIAS.map((c) => (
              <button key={c} type="button" onClick={() => setCategoria(c)} className={catFinal === c ? 'chip-on' : 'chip'}>{c}</button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

function DetallePqr({ p, onClose }: { p: Pqr; onClose: () => void }) {
  const { asignar, cambiarEstado, responder } = usePqr()
  const { empleados } = useNomina()
  const toast = useToast()
  const [respuesta, setRespuesta] = useState(p.respuesta ?? '')
  const [confirmCerrar, setConfirmCerrar] = useState(false)
  const puedeResponder = abierta(p)

  return (
    <>
      <div className="px-6 py-5 border-b border-gray-100 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs font-bold text-gray-500">{p.radicado}</p>
            <h2 className="text-lg font-extrabold text-dark mt-1">{p.tipo} · {p.categoria}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ESTADO_CLS[p.estado]}`}>{p.estado}</span>
              <Semaforo p={p} />
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400"><Ico d={D.x} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[['Usuario', p.nombre], ['Sector', p.barrio], ['Teléfono', p.telefono || '—'], ['Canal', p.canal], ['Radicada', `${fecha(p.radicadaEn)} ${hora(p.radicadaEn)}`], ['Fecha límite', fecha(p.vence)]].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-gray-soft px-3 py-2"><p className="text-[11px] text-gray-400">{k}</p><p className="font-semibold text-dark">{v}</p></div>
          ))}
        </div>
        <div>
          <p className="field-label">Lo que reporta el usuario</p>
          <p className="text-sm text-dark leading-relaxed rounded-xl border border-gray-100 p-3">{p.descripcion}</p>
        </div>
        <div>
          <label className="field-label">Responsable</label>
          <select value={p.responsable ?? ''} disabled={!puedeResponder} onChange={(e) => { asignar(p.radicado, e.target.value); toast('PQR asignada', e.target.value) }} className="field">
            <option value="" disabled>Sin asignar</option>
            {empleados.filter((e) => e.activo).map((e) => <option key={e.id} value={e.nombre}>{e.nombre} · {e.cargo}</option>)}
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="field-label !mb-0">Respuesta</label>
            {puedeResponder && !respuesta && <button onClick={() => setRespuesta(PLANTILLAS[p.categoria])} className="text-xs font-semibold text-secondary hover:underline">Usar plantilla</button>}
          </div>
          <textarea value={respuesta} onChange={(e) => setRespuesta(e.target.value)} disabled={!puedeResponder} rows={5} placeholder="Escribe la respuesta al usuario" className="field resize-none disabled:bg-gray-soft" />
          {/\[[^\]]+\]/.test(respuesta) && puedeResponder && <p className="text-[11px] text-amber-700 mt-1">Completa los campos entre [corchetes] antes de enviar.</p>}
        </div>
        <div>
          <p className="field-label">Historial</p>
          <ol className="relative border-l border-gray-200 ml-1.5 space-y-3">
            {[...p.historial].reverse().map((ev, i) => (
              <li key={i} className="pl-4">
                <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-white border-2 border-secondary" />
                <p className="text-sm text-dark">{ev.accion}</p>
                <p className="text-[11px] text-gray-400">{ev.usuario} · {fecha(ev.ts)} {hora(ev.ts)}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div className="px-6 py-4 border-t border-gray-100 flex gap-2 shrink-0">
        {puedeResponder ? (
          <button disabled={respuesta.trim().length < 15 || /\[[^\]]+\]/.test(respuesta)} onClick={() => { responder(p.radicado, respuesta.trim()); toast('Respuesta registrada', p.radicado) }} className="btn-primary flex-1"><Ico d={D.send} /> Enviar respuesta</button>
        ) : p.estado === 'Respondida' ? (
          <button onClick={() => setConfirmCerrar(true)} className="btn-secondary flex-1">Cerrar caso</button>
        ) : (
          <p className="text-sm text-gray-400 flex-1 text-center">Caso cerrado</p>
        )}
      </div>
      <ConfirmDialog open={confirmCerrar} title="¿Cerrar el caso?" message="Ciérralo cuando el usuario haya recibido la respuesta y no haya recursos pendientes." confirmLabel="Cerrar caso" onCancel={() => setConfirmCerrar(false)} onConfirm={() => { cambiarEstado(p.radicado, 'Cerrada'); setConfirmCerrar(false); toast('Caso cerrado', p.radicado) }} />
    </>
  )
}
