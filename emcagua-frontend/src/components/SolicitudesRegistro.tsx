import { useMemo, useState } from 'react'
import Modal from './ui/Modal'
import Ico from './ui/Icon'
import { useToast } from './ui/Toast'
import { aprobarSolicitud, rechazarSolicitud, type SolicitudRegistro } from '../data/solicitudes'
import { barriosDe, sectores, useZonas } from '../data/zonas'
import { cobroFijo } from '../data/constants'
import type { Usuario } from '../data/types'
import { cop, fecha, hora } from '../utils/format'

const PERSONA = 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z'
const mensaje = (e: unknown) => (e instanceof Error ? e.message : String(e))

/** Siguiente código libre: el mayor código numérico + 1 (mínimo 1000). */
function siguienteCodigo(usuarios: Usuario[]) {
  const nums = usuarios.map((u) => Number(u.id)).filter((n) => Number.isFinite(n))
  return String(Math.max(999, ...nums) + 1)
}

/** Aviso en Usuarios con las personas que se registraron solas en la oficina virtual. */
export function AvisoSolicitudes({ solicitudes, onAbrir }: { solicitudes: SolicitudRegistro[]; onAbrir: () => void }) {
  const pend = solicitudes.filter((s) => s.estado === 'Pendiente')
  if (!pend.length) return null
  return (
    <div className="mb-4 rounded-2xl border border-secondary/20 bg-gradient-to-r from-secondary/5 to-white px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="h-9 w-9 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0"><Ico d={PERSONA} /></span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-dark">{pend.length} {pend.length === 1 ? 'persona se registró' : 'personas se registraron'} en la oficina virtual</p>
          <p className="text-xs text-gray-500 truncate">{pend.map((s) => s.nombre).join(', ')} · revisa sus datos y aprueba para crear el predio</p>
        </div>
      </div>
      <button onClick={onAbrir} className="btn-primary h-9 shrink-0">Revisar solicitudes</button>
    </div>
  )
}

/** Lista de solicitudes y revisión de cada una (aprobar con datos corregidos o rechazar con motivo). */
export function SolicitudesModal({ solicitudes, usuarios, onClose, onCreado }: { solicitudes: SolicitudRegistro[]; usuarios: Usuario[]; onClose: () => void; onCreado: (codigo: string) => void }) {
  const [ver, setVer] = useState<'Pendiente' | 'Revisadas'>('Pendiente')
  const [sel, setSel] = useState<SolicitudRegistro | null>(null)
  const lista = solicitudes.filter((s) => (ver === 'Pendiente' ? s.estado === 'Pendiente' : s.estado !== 'Pendiente'))
  if (sel) return <Revisar s={sel} usuarios={usuarios} onVolver={() => setSel(null)} onListo={(codigo) => { setSel(null); if (codigo) onCreado(codigo) }} />
  return (
    <Modal open onClose={onClose} title="Solicitudes de registro" subtitle="Personas que se registraron solas en la oficina virtual" size="lg">
      <div className="px-6 py-4">
        <div className="flex gap-1.5 mb-3">
          {(['Pendiente', 'Revisadas'] as const).map((v) => (
            <button key={v} onClick={() => setVer(v)} className={ver === v ? 'chip-on' : 'chip'}>{v === 'Pendiente' ? 'Por revisar' : 'Revisadas'} · {solicitudes.filter((s) => (v === 'Pendiente' ? s.estado === 'Pendiente' : s.estado !== 'Pendiente')).length}</button>
          ))}
        </div>
        {lista.length === 0 && <p className="text-sm text-gray-500 py-8 text-center">{ver === 'Pendiente' ? 'No hay solicitudes por revisar.' : 'Todavía no se ha revisado ninguna.'}</p>}
        <ul className="divide-y divide-gray-100">
          {lista.map((s) => (
            <li key={s.id}>
              <button disabled={s.estado !== 'Pendiente'} onClick={() => setSel(s)} className="w-full text-left py-3 flex items-center gap-3 hover:bg-gray-soft/60 rounded-xl px-2 disabled:hover:bg-transparent disabled:cursor-default">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-dark">{s.nombre} <span className="text-xs font-normal text-gray-400">· C.C. {s.cedula}</span></p>
                  <p className="text-xs text-gray-500 truncate">{s.direccion} · {s.barrio ? `${s.barrio}, ` : ''}{s.sector} · estrato {s.estrato} · {s.telefono}</p>
                  <p className="text-[11px] text-gray-400">{s.radicado} · {fecha(s.creada)} {hora(s.creada)}{s.revisadaPor ? ` · revisó ${s.revisadaPor}` : ''}</p>
                  {s.estado === 'Rechazada' && <p className="text-xs text-red-600 mt-0.5">Rechazada: {s.motivo}</p>}
                </div>
                {s.estado === 'Pendiente' ? <span className="btn-sm">Revisar</span> : s.estado === 'Aprobada' ? <span className="badge-ok">Predio {s.predio}</span> : <span className="badge-bad">Rechazada</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  )
}

function Revisar({ s, usuarios, onVolver, onListo }: { s: SolicitudRegistro; usuarios: Usuario[]; onVolver: () => void; onListo: (codigo?: string) => void }) {
  useZonas()
  const toast = useToast()
  const sugerido = useMemo(() => siguienteCodigo(usuarios), [usuarios])
  const barrioValido = barriosDe(s.sector).includes(s.barrio) ? s.barrio : ''
  const [f, setF] = useState({ id: sugerido, nombre: s.nombre, cedula: s.cedula, telefono: s.telefono.replace(/\D/g, ''), direccion: s.direccion, sector: s.sector || sectores()[0], barrio: barrioValido, estrato: Math.min(3, Math.max(1, s.estrato)), conMedidor: s.conMedidor, medidor: s.medidor })
  const [rechazo, setRechazo] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))
  const dueno = usuarios.find((u) => u.cedula.replace(/\D/g, '') === s.cedula)

  const aprobar = async () => {
    if (!/^\d{3,10}$/.test(f.id)) return toast('Código inválido', 'El código del predio debe tener solo números (3 a 10 dígitos).', 'warning')
    setOcupado(true)
    try {
      await aprobarSolicitud(s.id, { ...f, medidor: f.conMedidor ? f.medidor : '' })
      toast('Solicitud aprobada', `Se creó el predio ${f.id}. ${s.nombre} ya puede entrar a la oficina virtual con su cédula y contraseña.`)
      onListo(f.id)
    } catch (e) { toast('No se aprobó', mensaje(e), 'warning') } finally { setOcupado(false) }
  }
  const rechazar = async () => {
    if (!rechazo?.trim()) return toast('Falta el motivo', 'Escribe por qué se rechaza: la persona lo verá al intentar entrar.', 'warning')
    setOcupado(true)
    try { await rechazarSolicitud(s.id, rechazo.trim()); toast('Solicitud rechazada', s.nombre); onListo() } catch (e) { toast('No se rechazó', mensaje(e), 'warning') } finally { setOcupado(false) }
  }

  return (
    <Modal open onClose={onVolver} title={`Revisar · ${s.nombre}`} subtitle={`${s.radicado} · ${fecha(s.creada)} ${hora(s.creada)}`} size="lg"
      footer={rechazo === null ? <>
        <button onClick={onVolver} className="btn-secondary">Volver</button>
        <button disabled={ocupado} onClick={() => setRechazo('')} className="btn-secondary text-red-600 border-red-200 hover:bg-red-50">Rechazar</button>
        <button disabled={ocupado} onClick={() => void aprobar()} className="btn-primary flex-1">{ocupado ? 'Creando…' : `Aprobar y crear predio ${f.id}`}</button>
      </> : <>
        <button onClick={() => setRechazo(null)} className="btn-secondary">Cancelar</button>
        <button disabled={ocupado} onClick={() => void rechazar()} className="btn flex-1 bg-red-600 text-white hover:bg-red-700">Confirmar rechazo</button>
      </>}>
      <div className="px-6 py-4 space-y-4">
        <div className="rounded-xl bg-gray-soft p-3 text-xs text-gray-600 space-y-0.5">
          <p><b className="text-dark">Lo que escribió la persona:</b> {s.direccion} · {s.barrio ? `${s.barrio}, ` : ''}{s.sector} · estrato {s.estrato} · {s.conMedidor ? `medidor ${s.medidor || '(sin número)'}` : 'sin medidor'}</p>
          <p>Celular {s.telefono}{s.correo ? ` · ${s.correo}` : ''}</p>
          {s.observacion && <p>Nota: “{s.observacion}”</p>}
          {dueno && <p className="text-amber-700 font-semibold">Ojo: esta cédula ya es dueña del predio {dueno.id}. Al aprobar se le agrega un predio más.</p>}
        </div>

        {rechazo !== null ? (
          <div>
            <label className="field-label">Motivo del rechazo (la persona lo verá)</label>
            <textarea value={rechazo} onChange={(e) => setRechazo(e.target.value)} rows={3} placeholder="Ej: la dirección no está en la zona de servicio de EMCAGUA" className="field py-2.5 h-auto" />
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600">Revisa y corrige si hace falta (por ejemplo, el estrato real o el barrio). Al aprobar se crea el predio y la persona queda con su cuenta de la oficina virtual.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="field-label">Código del predio</label><input value={f.id} onChange={(e) => set('id', e.target.value.replace(/\D/g, ''))} className="field tabular-nums" /><p className="text-[11px] text-gray-400 mt-1">Sugerido: el siguiente libre ({sugerido}).</p></div>
              <div><label className="field-label">Nombre completo</label><input value={f.nombre} onChange={(e) => set('nombre', e.target.value)} className="field" /></div>
              <div><label className="field-label">Cédula</label><input value={f.cedula} onChange={(e) => set('cedula', e.target.value.replace(/\D/g, ''))} className="field tabular-nums" /></div>
              <div><label className="field-label">Celular</label><input value={f.telefono} onChange={(e) => set('telefono', e.target.value.replace(/\D/g, '').slice(0, 10))} className="field tabular-nums" /></div>
              <div className="sm:col-span-2"><label className="field-label">Dirección</label><input value={f.direccion} onChange={(e) => set('direccion', e.target.value)} className="field" /></div>
              <div><label className="field-label">Sector</label><select value={f.sector} onChange={(e) => setF((x) => ({ ...x, sector: e.target.value, barrio: '' }))} className="field">{sectores().map((z) => <option key={z}>{z}</option>)}</select></div>
              <div>
                <label className="field-label">Barrio</label>
                <select value={f.barrio} onChange={(e) => set('barrio', e.target.value)} className="field"><option value="">Sin barrio</option>{barriosDe(f.sector).map((b) => <option key={b}>{b}</option>)}</select>
                {s.barrio && !barrioValido && <p className="text-[11px] text-amber-700 mt-1">Escribió “{s.barrio}”, que no está creado en {s.sector}. Créalo en Configuración si existe.</p>}
              </div>
              <div>
                <label className="field-label">Estrato</label>
                <div className="flex gap-2">{[1, 2, 3].map((e) => <button key={e} type="button" onClick={() => set('estrato', e)} className={`flex-1 h-10 rounded-xl border-2 text-sm font-bold ${f.estrato === e ? 'border-secondary text-secondary bg-secondary/5' : 'border-gray-200 text-gray-500'}`}>{e}</button>)}</div>
                <p className="text-[11px] text-gray-400 mt-1">Sin medidor paga {cop(cobroFijo(f.estrato))} al mes.</p>
              </div>
              <div>
                <label className="field-label">Medidor</label>
                <label className="flex items-center gap-2 text-sm h-10"><input type="checkbox" checked={f.conMedidor} onChange={(e) => set('conMedidor', e.target.checked)} className="accent-secondary h-4 w-4" /> Tiene medidor instalado</label>
                {f.conMedidor && <input value={f.medidor} onChange={(e) => set('medidor', e.target.value)} placeholder="Número del medidor" className="field" />}
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
