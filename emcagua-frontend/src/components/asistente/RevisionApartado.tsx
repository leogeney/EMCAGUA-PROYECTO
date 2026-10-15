import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { NOMBRE_MODULO, posponerHallazgo, useRevision, type Hallazgo, type NivelHallazgo } from '../../data/revision'
import { marcarRecomendacion, useRecomendaciones, type Recomendacion } from '../../data/recomendaciones'
import { useAsistente } from '../../data/AsistenteContext'
import Ico from '../ui/Icon'
import { Gotita } from './Conversacion'

const ESTILO: Record<NivelHallazgo, { punto: string; caja: string; texto: string; icono: string }> = {
  problema: { punto: 'bg-red-500', caja: 'bg-red-50 text-red-600', texto: 'Problema', icono: 'M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z' },
  falta: { punto: 'bg-amber-400', caja: 'bg-amber-50 text-amber-700', texto: 'Falta', icono: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  consejo: { punto: 'bg-secondary', caja: 'bg-secondary/10 text-secondary', texto: 'Consejo', icono: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
}
const ORDEN: Record<NivelHallazgo, number> = { problema: 0, falta: 1, consejo: 2 }

type Item = { id: string; nivel: NivelHallazgo; titulo: string; detalle: string; accion?: { label: string; to: string }; modulo?: string; posponer: () => void }

const CLAVE_ABIERTA = 'emcagua_revision_abierta'
const leerAbierta = () => { try { return localStorage.getItem(CLAVE_ABIERTA) !== '0' } catch { return true } }

/**
 * Barra de Gotita arriba de cada pantalla: lo que encontró mal, lo que falta y lo que recomienda
 * hacer en ESE apartado. En Mi día y Dashboard muestra la revisión de todo el sistema.
 */
export default function RevisionApartado() {
  const { pathname } = useLocation()
  const modulo = pathname.split('/')[1] || 'mi-dia'
  const general = modulo === 'mi-dia' || modulo === 'dashboard'
  const hallazgos = useRevision()
  const recos = useRecomendaciones()
  const { ia, modelo, enviar, setAbierto } = useAsistente()
  const [abierta, setAbiertaEstado] = useState(leerAbierta)
  const [todas, setTodas] = useState(false)
  const setAbierta = (v: boolean) => { setAbiertaEstado(v); try { localStorage.setItem(CLAVE_ABIERTA, v ? '1' : '0') } catch { /* sin almacenamiento */ } }

  if (modulo === 'asistente') return null
  const deAqui: Item[] = [
    ...hallazgos.filter((h: Hallazgo) => general || h.modulo === modulo).map((h) => ({ ...h, posponer: () => posponerHallazgo(h.id) })),
    // En Mi día las recomendaciones ya salen abajo ("Gotita te recomienda")
    ...(general ? [] : recos.filter((r: Recomendacion) => r.rutas.includes(`/${modulo}`)).map((r) => ({ id: r.id, nivel: (r.prioridad === 1 ? 'problema' : 'consejo') as NivelHallazgo, titulo: r.titulo, detalle: r.porque, accion: r.accion, posponer: () => marcarRecomendacion(r.id, 'luego') }))),
  ].sort((a, b) => ORDEN[a.nivel] - ORDEN[b.nivel])
  if (!deAqui.length) return null

  const cuenta = (n: NivelHallazgo) => deAqui.filter((x) => x.nivel === n).length
  const nombre = general ? 'todo el sistema' : NOMBRE_MODULO[modulo] ?? modulo
  const visibles = todas ? deAqui : deAqui.slice(0, 4)
  const analizar = () => {
    setAbierto(true)
    enviar(general
      ? 'Revisa toda la información del sistema y dime: 1) qué está mal, 2) qué datos faltan y 3) qué me recomiendas hacer primero esta semana. Sé concreto, con nombres y cifras.'
      : `Revisa los datos del apartado ${nombre} y dime: 1) qué está mal, 2) qué datos faltan y 3) qué me recomiendas hacer. Sé concreto, con nombres y cifras.`, true)
  }

  return (
    <div className="no-print px-4 sm:px-6 lg:px-8 pt-4 max-w-7xl mx-auto w-full">
      <section className="rounded-2xl border border-gray-100 bg-white/90 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
          <button onClick={() => setAbierta(!abierta)} className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
            <Gotita className="w-7 h-7 shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-dark truncate">Gotita revisó {nombre}</span>
              <span className="flex flex-wrap items-center gap-x-3 text-xs text-gray-500">
                {(['problema', 'falta', 'consejo'] as const).filter((n) => cuenta(n)).map((n) => (
                  <span key={n} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${ESTILO[n].punto}`} />{cuenta(n)} {n === 'problema' ? 'por corregir' : n === 'falta' ? 'dato(s) por llenar' : 'consejo(s)'}</span>
                ))}
              </span>
            </span>
            <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${abierta ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {ia?.ok && modelo && <button onClick={analizar} className="btn-sm h-8 shrink-0">Analizar con IA</button>}
        </div>
        {abierta && (
          <ul className="border-t border-gray-100 divide-y divide-gray-50">
            {visibles.map((x) => (
              <li key={x.id} className="flex items-start gap-3 px-4 py-3">
                <span className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${ESTILO[x.nivel].caja}`}><Ico d={ESTILO[x.nivel].icono} className="w-4 h-4" /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-dark leading-snug">
                    {x.titulo}
                    {general && x.modulo && <span className="ml-2 text-[11px] font-medium text-gray-400">· {NOMBRE_MODULO[x.modulo] ?? x.modulo}</span>}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{x.detalle}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                    {x.accion && x.accion.to !== pathname && <Link to={x.accion.to} className="text-xs font-semibold text-secondary hover:underline">{x.accion.label} →</Link>}
                    <button onClick={x.posponer} className="text-xs text-gray-400 hover:text-dark">Ahora no</button>
                  </div>
                </div>
                <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider text-gray-300 shrink-0 mt-1">{ESTILO[x.nivel].texto}</span>
              </li>
            ))}
            {deAqui.length > 4 && (
              <li className="px-4 py-2"><button onClick={() => setTodas(!todas)} className="text-xs font-semibold text-secondary hover:underline">{todas ? 'Ver menos' : `Ver las ${deAqui.length}`}</button></li>
            )}
          </ul>
        )}
      </section>
    </div>
  )
}
