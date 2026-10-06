import { Link } from 'react-router-dom'
import { ICONO_AREA, marcarRecomendacion, type Recomendacion } from '../../data/recomendaciones'
import { useAsistente } from '../../data/AsistenteContext'
import Ico from '../ui/Icon'
import { Gotita } from './Conversacion'

const COLOR = { 1: 'bg-red-50 text-red-600', 2: 'bg-amber-50 text-amber-700', 3: 'bg-secondary/10 text-secondary' }
const ETIQUETA = { 1: 'Hazlo ya', 2: 'Esta semana', 3: 'Cuando puedas' }

export function TarjetaReco({ r, compacta, onIr }: { r: Recomendacion; compacta?: boolean; onIr?: () => void }) {
  return (
    <div className={`card ${compacta ? 'p-3' : 'p-4'} flex items-start gap-3`}>
      <span className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${COLOR[r.prioridad]}`}><Ico d={ICONO_AREA[r.area]} className="w-5 h-5" /></span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{r.area} · <span className={r.prioridad === 1 ? 'text-red-600' : ''}>{ETIQUETA[r.prioridad]}</span></p>
        <p className="font-semibold text-dark leading-snug mt-0.5">{r.titulo}</p>
        <p className={`text-sm text-gray-500 mt-1 ${compacta ? 'line-clamp-3' : ''}`}>{r.porque}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3">
          <Link to={r.accion.to} onClick={onIr} className="btn-primary h-8 px-3 text-xs whitespace-nowrap">{r.accion.label}</Link>
          <button onClick={() => marcarRecomendacion(r.id, 'hecho')} className="text-xs font-semibold text-gray-500 hover:text-green-700">✓ Ya lo hice</button>
          <button onClick={() => marcarRecomendacion(r.id, 'luego')} className="text-xs font-semibold text-gray-400 hover:text-dark">Ahora no</button>
        </div>
      </div>
    </div>
  )
}

/** Bloque "Gotita te recomienda" para Mi día. */
export function PanelRecomendaciones({ recos, max = 4 }: { recos: Recomendacion[]; max?: number }) {
  const { enviar, setAbierto, ia, modelo } = useAsistente()
  const plan = () => {
    setAbierto(true)
    enviar('Con las recomendaciones que detectó el sistema, arma un plan de trabajo corto para esta semana: qué hacer primero, qué día y qué cargo debería encargarse (gerente, secretaria, cajera, técnico o contador).', true)
  }
  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-bold text-dark flex items-center gap-2"><Gotita className="w-6 h-6" /> Gotita te recomienda</h2>
        {recos.length > 1 && ia?.ok && modelo && <button onClick={plan} className="text-xs font-semibold text-secondary hover:underline">Armar plan de la semana con IA</button>}
      </div>
      {recos.length === 0 ? (
        <div className="card p-5 text-sm text-gray-500">Revisé cartera, medidores, pérdidas, inventario, PQR y gastos: no veo nada que mejorar por ahora.</div>
      ) : (
        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-2.5">
          {recos.slice(0, max).map((r) => <TarjetaReco key={r.id} r={r} />)}
        </div>
      )}
      {recos.length > max && <p className="text-xs text-gray-400 mt-2">Y {recos.length - max} más. Pregúntale a Gotita «¿qué me recomiendas?».</p>}
    </section>
  )
}
