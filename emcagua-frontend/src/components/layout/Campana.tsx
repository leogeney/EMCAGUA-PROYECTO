import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAlertas } from '../../data/alertas'
import Icon from '../ui/Icon'
import { getUsername, puede } from '../../utils/session'

const CAMPANA = 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
const COLOR = { alta: 'bg-red-100 text-red-600', media: 'bg-amber-100 text-amber-700', info: 'bg-secondary/10 text-secondary' }

/** "hace 5 min", "hace 2 h", "ayer"… */
function hace(ts: number) {
  const min = Math.round((Date.now() - ts) / 60_000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? 'ayer' : `hace ${d} días`
}

// Las leídas se recuerdan en este navegador, por usuario (si no hay almacenamiento, solo dura la sesión)
const claveLeidas = () => `emcagua_leidas_${getUsername('').toLowerCase()}`
function leerLeidas(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(claveLeidas()) ?? '[]') as string[]) } catch { return new Set() }
}
function guardarLeidas(s: Set<string>) {
  try { localStorage.setItem(claveLeidas(), JSON.stringify([...s].slice(-300))) } catch { /* sin almacenamiento */ }
}

/** Campanita: avisos y novedades (PQR, pagos, facturas, caja…) según el rol, con contador de no leídos. */
export default function Campana() {
  const alertas = useAlertas()
  const navigate = useNavigate()
  const [abierta, setAbierta] = useState(false)
  const [leidas, setLeidasEstado] = useState<Set<string>>(leerLeidas)
  const [soloNuevas, setSoloNuevas] = useState(false)
  const setLeidas = (f: (s: Set<string>) => Set<string>) => setLeidasEstado((s) => { const n = f(s); guardarLeidas(n); return n })
  const caja = useRef<HTMLDivElement>(null)
  const nuevas = alertas.filter((a) => !leidas.has(a.id))
  const urgentes = nuevas.filter((a) => a.nivel !== 'info').length

  useEffect(() => {
    if (!abierta) return
    const fuera = (e: MouseEvent) => { if (caja.current && !caja.current.contains(e.target as Node)) setAbierta(false) }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAbierta(false)
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc) }
  }, [abierta])

  const ir = (id: string, to: string) => { setLeidas((s) => new Set(s).add(id)); setAbierta(false); navigate(to) }
  const visibles = soloNuevas ? nuevas : alertas

  return (
    <div ref={caja} className="relative">
      <button onClick={() => setAbierta((a) => !a)} className={`relative h-9 w-9 rounded-xl border shadow-sm flex items-center justify-center transition-colors ${abierta ? 'bg-dark text-white border-dark' : 'bg-white border-gray-100 hover:bg-gray-50 text-gray-500'}`} aria-label={`Notificaciones${nuevas.length ? `: ${nuevas.length} sin leer` : ''}`}>
        <Icon d={CAMPANA} className="w-5 h-5" strokeWidth={1.6} />
        {nuevas.length > 0 && <span className={`absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center border-2 border-white ${urgentes ? 'bg-red-500' : 'bg-secondary'}`}>{nuevas.length}</span>}
      </button>

      {abierta && (
        <div className="absolute right-0 top-11 w-[min(380px,calc(100vw-24px))] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-[pop_.15s_ease-out]">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="font-bold text-dark">Notificaciones</p>
            {nuevas.length > 0 && <button onClick={() => setLeidas((s) => new Set([...s, ...alertas.map((a) => a.id)]))} className="text-xs font-semibold text-secondary hover:underline">Marcar todo como leído</button>}
          </div>
          <div className="px-4 pt-2.5 pb-1 flex gap-1.5">
            <button onClick={() => setSoloNuevas(false)} className={!soloNuevas ? 'chip-on' : 'chip'}>Todas · {alertas.length}</button>
            <button onClick={() => setSoloNuevas(true)} className={soloNuevas ? 'chip-on' : 'chip'}>Sin leer · {nuevas.length}</button>
          </div>
          <ul className="max-h-[460px] overflow-y-auto divide-y divide-gray-50">
            {visibles.length === 0 && <li className="px-4 py-10 text-center text-sm text-gray-500">{soloNuevas && alertas.length ? 'Ya leíste todo.' : 'No hay avisos. Todo al día 👍'}</li>}
            {visibles.map((a) => {
              const leida = leidas.has(a.id)
              return (
                <li key={a.id}>
                  <button onClick={() => ir(a.id, a.to)} className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-soft/60 ${leida ? 'opacity-55' : ''}`}>
                    <span className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${COLOR[a.nivel]}`}><Icon d={a.icono} className="w-4.5 h-4.5" /></span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2"><span className="text-sm font-semibold text-dark">{a.titulo}</span>{!leida && <span className={`h-2 w-2 rounded-full shrink-0 ${a.nivel === 'alta' ? 'bg-red-500' : a.nivel === 'media' ? 'bg-amber-400' : 'bg-secondary'}`} />}</span>
                      <span className="block text-xs text-gray-500 mt-0.5 line-clamp-2">{a.detalle}</span>
                      {a.ts && <span className="block text-[11px] text-gray-400 mt-1">{hace(a.ts)}</span>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          {puede('mi-dia') && <button onClick={() => { setAbierta(false); navigate('/mi-dia') }} className="w-full px-4 py-2.5 border-t border-gray-100 text-xs font-semibold text-secondary hover:bg-gray-soft/60">Ver todo en Mi día</button>}
        </div>
      )}
    </div>
  )
}
