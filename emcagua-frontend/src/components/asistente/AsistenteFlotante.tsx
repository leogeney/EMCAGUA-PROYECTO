import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAsistente } from '../../data/AsistenteContext'
import { useData } from '../../data/DataContext'
import { usePqr } from '../../data/PqrContext'
import { sugerenciasPara } from '../../data/asistente'
import { diasHabilesRestantes } from '../../data/pqr'
import { ALARMAS } from '../../data/telemetria'
import Conversacion, { Gotita } from './Conversacion'
import { TarjetaReco } from './Recomendaciones'
import HistorialChats from './HistorialChats'
import { marcarRecomendacion, useRecomendaciones, type Recomendacion } from '../../data/recomendaciones'
import Ico from '../ui/Icon'
import { puede } from '../../utils/session'

const D = {
  x: 'M6 18L18 6M6 6l12 12',
  max: 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4',
  plus: 'M12 4v16m8-8H4',
  lista: 'M4 6h16M4 12h16M4 18h10',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
}

const NOMBRES: Record<string, string> = { '/mi-dia': 'Mi día', '/dashboard': 'el Dashboard', '/analitica': 'Analítica', '/usuarios': 'Usuarios', '/lecturas': 'Medidores', '/facturacion': 'Facturación', '/pagos': 'Pagos y caja', '/pqr': 'PQR', '/perdidas': 'Pérdidas de agua', '/inventario': 'Inventario', '/nomina': 'Nómina' }

/** Gotita acompaña al gerente en todas las pantallas: botón flotante, atajo Ctrl + K. */
export default function AsistenteFlotante() {
  const { pathname } = useLocation()
  const { ia, modelo, nuevoChat, mensajes, abierto, setAbierto, chats } = useAsistente()
  const [verChats, setVerChats] = useState(false)
  const recos = useRecomendaciones()
  const { alarmas } = useData()
  const { pqrs } = usePqr()
  const [aviso, setAviso] = useState(true)
  // Consejo que Gotita ofrece sola al entrar a una pantalla (una vez por consejo en la sesión)
  const [consejo, setConsejo] = useState<Recomendacion | null>(null)
  const [dichos, setDichos] = useState<Set<string>>(() => new Set())
  const deEstaPantalla = recos.filter((r) => r.rutas.includes(pathname))

  const urgentes = pqrs.filter((p) => (p.estado === 'Radicada' || p.estado === 'En trámite') && diasHabilesRestantes(p.vence) < 0).length + alarmas.filter((a) => ALARMAS[a.tipo].grave).length

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setAbierto((a) => !a); setAviso(false) }
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => setAviso(false), 9000)
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(t) }
  }, [setAbierto])

  const candidato = deEstaPantalla.find((r) => !dichos.has(r.id))
  useEffect(() => {
    if (!candidato || abierto || consejo) return
    const mostrar = setTimeout(() => { setDichos((d) => new Set(d).add(candidato.id)); setConsejo(candidato) }, aviso ? 9500 : 1500)
    return () => clearTimeout(mostrar)
  }, [candidato, abierto, aviso, pathname, consejo])
  useEffect(() => {
    if (!consejo) return
    const t = setTimeout(() => setConsejo(null), 20000)
    return () => clearTimeout(t)
  }, [consejo])
  // Si se cambia de pantalla, el consejo de la anterior ya no aplica
  useEffect(() => { const t = setTimeout(() => setConsejo((c) => (c && c.rutas.includes(pathname) ? c : null)), 0); return () => clearTimeout(t) }, [pathname])

  if (pathname === '/asistente' || !puede('asistente')) return null
  const abrir = () => { setAbierto(true); setAviso(false); setConsejo(null) }

  return (
    <div className="no-print">
      {abierto && (
        <section className="fixed z-50 inset-0 sm:inset-auto sm:bottom-24 sm:right-6 sm:w-[400px] sm:h-[620px] sm:max-h-[calc(100vh-130px)] bg-white sm:rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-[pop_.15s_ease-out]">
          <header className="px-4 py-3 bg-gradient-to-r from-secondary-700 to-secondary text-white flex items-center gap-3 shrink-0">
            <span className="h-10 w-10 rounded-2xl bg-white/15 flex items-center justify-center"><Gotita className="w-7 h-7" /></span>
            <div className="flex-1 min-w-0">
              <p className="font-bold leading-tight">Gotita</p>
              <p className="text-[11px] text-white/75 flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${ia?.ok ? 'bg-green-300' : 'bg-amber-300'}`} />{ia?.ok ? `IA local · ${modelo}` : 'Respuestas rápidas con los datos'}</p>
            </div>
            <button onClick={() => setVerChats((v) => !v)} className={`h-8 px-2 rounded-lg flex items-center justify-center gap-1 text-xs font-semibold ${verChats ? 'bg-white/20' : 'hover:bg-white/10'}`} title="Chats guardados"><Ico d={D.lista} />{chats.length > 0 && chats.length}</button>
            {mensajes.length > 0 && <button onClick={() => { nuevoChat(); setVerChats(false) }} className="h-8 w-8 rounded-lg hover:bg-white/10 flex items-center justify-center" title="Nuevo chat"><Ico d={D.plus} /></button>}
            <Link to="/asistente" onClick={() => setAbierto(false)} className="h-8 w-8 rounded-lg hover:bg-white/10 flex items-center justify-center" title="Abrir en pantalla completa"><Ico d={D.max} /></Link>
            <button onClick={() => setAbierto(false)} className="h-8 w-8 rounded-lg hover:bg-white/10 flex items-center justify-center" aria-label="Cerrar"><Ico d={D.x} /></button>
          </header>
          {verChats && <div className="flex-1 min-h-0 bg-white"><HistorialChats compacto onElegir={() => setVerChats(false)} /></div>}
          <div className={verChats ? 'hidden' : 'contents'}>
          <Conversacion
            compacto
            sugerencias={sugerenciasPara(pathname)}
            vacio={
              <>
              <div className="flex gap-2 items-start">
                <Gotita className="w-7 h-7 shrink-0 mt-1" />
                <div className="rounded-2xl rounded-bl-md bg-gray-soft px-3.5 py-2.5 text-sm text-dark">
                  ¡Hola! Soy Gotita. {NOMBRES[pathname] ? <>Estás en <b>{NOMBRES[pathname]}</b>. </> : ''}Pregúntame lo que necesites sobre la empresa, o dime a qué módulo quieres ir.
                  {urgentes > 0 && <p className="mt-1.5 text-red-700">Hay {urgentes} asunto(s) urgente(s) hoy.</p>}
                </div>
              </div>
              {(deEstaPantalla.length ? deEstaPantalla : recos).length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-1">Te recomiendo {deEstaPantalla.length ? 'aquí' : 'hoy'}</p>
                  {(deEstaPantalla.length ? deEstaPantalla : recos).slice(0, 2).map((r) => <TarjetaReco key={r.id} r={r} compacta onIr={() => setAbierto(false)} />)}
                </div>
              )}
              </>
            }
          />
          </div>
        </section>
      )}

      {consejo && !abierto && (
        <div role="status" className="fixed z-40 bottom-[92px] right-6 w-[300px] rounded-2xl rounded-br-md bg-white shadow-xl border border-gray-100 p-4 text-sm text-dark animate-[pop_.2s_ease-out]">
          <button onClick={() => setConsejo(null)} className="absolute top-2 right-2 h-6 w-6 rounded-md text-gray-400 hover:text-dark hover:bg-gray-50 flex items-center justify-center" aria-label="Cerrar consejo"><Ico d={D.x} className="w-3.5 h-3.5" /></button>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">💡 Te recomiendo</p>
          <p className="font-semibold leading-snug mt-1 pr-4">{consejo.titulo}</p>
          <p className="text-xs text-gray-500 mt-1 line-clamp-3">{consejo.porque}</p>
          <div className="flex items-center gap-3 mt-3">
            <Link to={consejo.accion.to} onClick={() => setConsejo(null)} className="btn-primary h-8 px-3 text-xs whitespace-nowrap">{consejo.accion.label}</Link>
            <button onClick={() => { marcarRecomendacion(consejo.id, 'luego'); setConsejo(null) }} className="text-xs font-semibold text-gray-400 hover:text-dark">Ahora no</button>
          </div>
        </div>
      )}

      {aviso && !abierto && !consejo && urgentes > 0 && (
        <button onClick={abrir} className="fixed z-40 bottom-[92px] right-6 max-w-[240px] text-left rounded-2xl rounded-br-md bg-white shadow-xl border border-gray-100 px-4 py-3 text-sm text-dark animate-[pop_.2s_ease-out]">
          Tienes <b>{urgentes} asunto(s) urgente(s)</b>. ¿Te cuento cuáles?
        </button>
      )}

      <button onClick={() => (abierto ? setAbierto(false) : abrir())} className="fixed z-40 bottom-6 right-6 h-16 w-16 rounded-full bg-white shadow-xl border border-gray-100 flex items-center justify-center hover:scale-105 transition-transform" title="Gotita, tu asistente (Ctrl + K)" aria-label="Abrir asistente">
        <Gotita className="w-10 h-10" />
        {urgentes > 0 && !abierto && <span className="absolute -top-1 -right-1 h-6 min-w-6 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center border-2 border-white">{urgentes}</span>}
      </button>
    </div>
  )
}
