/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getUsername } from '../utils/session'
import { useData } from './DataContext'
import { usePqr } from './PqrContext'
import { useOperacion } from './OperacionContext'
import { recomendacionesComoTexto, useRecomendaciones } from './recomendaciones'
import { calentarOllama, destinoNavegacion, estadoOllama, preguntarOllamaStream, respuestaRapida, responderSinIA, resumenParaModelo, type Mensaje } from './asistente'

const leer = (k: string, d: string) => { try { return localStorage.getItem(k) ?? d } catch { return d } }
const guardar = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* sin almacenamiento */ } }

/** Una conversación guardada con Gotita. */
export type Chat = { id: string; titulo: string; creada: number; actualizada: number; mensajes: Mensaje[] }
const MAX_CHATS = 60
const claveChats = (usuario: string) => `emcagua_chats_${usuario}`
/** Cada funcionario ve solo sus propias conversaciones (en este navegador hasta que exista el backend). */
function cargarChats(usuario: string): Chat[] {
  try { return JSON.parse(localStorage.getItem(claveChats(usuario)) ?? '[]') } catch { return [] }
}
const tituloDe = (p: string) => { const t = p.replace(/\s+/g, ' ').trim(); return t.length > 48 ? `${t.slice(0, 46)}…` : t }

type Ctx = {
  mensajes: Mensaje[]
  pensando: boolean
  /** Pregunta al asistente. `conIA` fuerza la IA aunque haya respuesta rápida. */
  enviar: (pregunta: string, conIA?: boolean) => void
  detener: () => void
  /** Empieza un chat nuevo (el actual queda guardado). */
  limpiar: () => void
  nuevoChat: () => void
  chats: Chat[]
  activaId: string | null
  abrirChat: (id: string) => void
  borrarChat: (id: string) => void
  renombrarChat: (id: string, titulo: string) => void
  ia: { ok: boolean; modelos: string[] } | null
  url: string
  modelo: string
  setUrl: (u: string) => void
  setModelo: (m: string) => void
  probar: (u?: string) => Promise<void>
  /** Ventana flotante de Gotita (se puede abrir desde cualquier pantalla). */
  abierto: boolean
  setAbierto: (v: boolean | ((a: boolean) => boolean)) => void
}

const C = createContext<Ctx | null>(null)

/**
 * Asistente compartido por toda la app (botón flotante y página Asistente IA).
 * 1) Navegación y preguntas frecuentes se contestan al instante con los datos del sistema.
 * 2) Lo demás va a la IA local, que responde palabra por palabra (streaming).
 */
export function AsistenteProvider({ children }: { children: ReactNode }) {
  const { usuarios, pagos, lecturas, alarmas } = useData()
  const { pqrs } = usePqr()
  const { materiales } = useOperacion()
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState(() => getUsername(''))
  const [chats, setChats] = useState<Chat[]>(() => cargarChats(getUsername('')))
  const [activaId, setActivaId] = useState<string | null>(null)
  const mensajes = useMemo(() => chats.find((c) => c.id === activaId)?.mensajes ?? [], [chats, activaId])

  // Si cambia el funcionario (cerrar sesión y entrar con otro), se cargan sus chats
  const { pathname } = useLocation()
  useEffect(() => {
    const u = getUsername('')
    if (u === usuario) return
    const t = setTimeout(() => { control.current?.abort(); setUsuario(u); setChats(cargarChats(u)); setActivaId(null) }, 0)
    return () => clearTimeout(t)
  }, [pathname, usuario])
  // Guardar (sin el estado "escribiendo" de una respuesta a medias)
  useEffect(() => {
    if (!usuario) return
    const t = setTimeout(() => guardar(claveChats(usuario), JSON.stringify(chats.slice(0, MAX_CHATS).map((c) => ({ ...c, mensajes: c.mensajes.map(({ escribiendo: _e, ...m }) => m) })))), 400)
    return () => clearTimeout(t)
  }, [chats, usuario])
  const [pensando, setPensando] = useState(false)
  const [ia, setIa] = useState<{ ok: boolean; modelos: string[] } | null>(null)
  const [url, setUrlState] = useState(() => leer('emc_ollama_url', 'http://localhost:11434'))
  const [modelo, setModeloState] = useState(() => leer('emc_ollama_modelo', ''))
  const control = useRef<AbortController | null>(null)
  const [abierto, setAbierto] = useState(false)
  const recos = useRecomendaciones()

  const setUrl = (u: string) => { setUrlState(u); guardar('emc_ollama_url', u) }
  const setModelo = useCallback((m: string) => { setModeloState(m); guardar('emc_ollama_modelo', m) }, [])

  const probar = useCallback(async (u = url) => {
    const e = await estadoOllama(u)
    setIa(e)
    if (e.ok && e.modelos.length) {
      const m = e.modelos.includes(modelo) ? modelo : e.modelos[0]
      if (m !== modelo) setModelo(m)
      calentarOllama(u, m) // deja el modelo cargado para que la primera respuesta no espere
    }
  }, [url, modelo, setModelo])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => probar(), 0); return () => clearTimeout(t) }, [])

  const enviar = useCallback(async (pregunta: string, conIA = false) => {
    const p = pregunta.trim()
    if (!p || pensando) return
    const historial: Mensaje[] = [...mensajes, { rol: 'usuario', texto: p }]
    // La respuesta va al chat donde se preguntó, aunque luego se cambie de chat
    let id = activaId
    if (!id || !chats.some((c) => c.id === id)) {
      id = `c${Date.now().toString(36)}`
      const ahora = Date.now()
      setChats((cs) => [{ id: id!, titulo: tituloDe(p), creada: ahora, actualizada: ahora, mensajes: [] }, ...cs].slice(0, MAX_CHATS))
      setActivaId(id)
    }
    const chatId = id
    const setMensajes = (v: Mensaje[] | ((m: Mensaje[]) => Mensaje[])) =>
      setChats((cs) => cs.map((c) => (c.id !== chatId ? c : { ...c, actualizada: Date.now(), mensajes: typeof v === 'function' ? v(c.mensajes) : v })))
    setMensajes(historial)
    const ctx = { usuarios, pagos, pqrs, lecturas, alarmas, materiales }

    // 1. Navegación: "llévame a pagos"
    const destino = !conIA && destinoNavegacion(p)
    if (destino) {
      navigate(destino.ruta)
      setMensajes([...historial, { rol: 'asistente', texto: `Listo, te llevé a **${destino.nombre}**.`, fuente: 'reglas' }])
      return
    }
    // 2. Respuesta instantánea con los datos
    const pideConsejo = /recomiend|recomendac|consej|sugier|sugerenc|que deberia|que me aconsej|que mejor/.test(p.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
    const consejo = pideConsejo ? (recos.length ? `**Te recomiendo, en este orden:**\n${recomendacionesComoTexto(recos)}\n\nEn **Mi día** tienes cada una con el botón para hacerla.` : 'Revisé todo y no veo nada que mejorar ahora mismo. 👍') : null
    const rapida = conIA ? null : consejo ?? respuestaRapida(p, ctx)
    const usarIA = !!(ia?.ok && modelo)
    if (rapida || !usarIA) {
      setMensajes([...historial, { rol: 'asistente', texto: rapida ?? responderSinIA(p, ctx), fuente: 'reglas', pregunta: usarIA && rapida ? p : undefined }])
      return
    }
    // 3. IA local, palabra por palabra
    setPensando(true)
    control.current = new AbortController()
    const base = [...historial, { rol: 'asistente' as const, texto: '', fuente: 'ollama' as const, escribiendo: true }]
    setMensajes(base)
    try {
      const final = await preguntarOllamaStream(url, modelo, historial, `${resumenParaModelo(ctx, p)}\n\nRECOMENDACIONES QUE EL SISTEMA YA DETECTÓ (úsalas si vienen al caso):\n${recomendacionesComoTexto(recos, 6).replace(/\*\*/g, '')}`, (parcial) => setMensajes([...historial, { rol: 'asistente', texto: parcial, fuente: 'ollama', escribiendo: true }]), control.current.signal)
      setMensajes([...historial, { rol: 'asistente', texto: final, fuente: 'ollama' }])
    } catch (e) {
      const cancelado = e instanceof DOMException && e.name === 'AbortError'
      setMensajes((m) => {
        const ult = m[m.length - 1]
        if (cancelado && ult?.texto) return [...m.slice(0, -1), { ...ult, escribiendo: false }]
        return [...historial, { rol: 'asistente', texto: cancelado ? 'Respuesta detenida.' : `No pude conectar con la IA. Te respondo con los datos del sistema:\n\n${responderSinIA(p, ctx)}`, fuente: 'reglas' }]
      })
    } finally {
      setPensando(false)
      control.current = null
    }
  }, [mensajes, pensando, usuarios, pagos, pqrs, lecturas, alarmas, materiales, ia, modelo, url, navigate, recos, activaId, chats])

  const detener = useCallback(() => control.current?.abort(), [])
  const nuevoChat = useCallback(() => { control.current?.abort(); setActivaId(null) }, [])
  const abrirChat = useCallback((id: string) => { control.current?.abort(); setActivaId(id) }, [])
  const borrarChat = useCallback((id: string) => {
    setChats((cs) => cs.filter((c) => c.id !== id))
    setActivaId((a) => { if (a === id) { control.current?.abort(); return null } return a })
  }, [])
  const renombrarChat = useCallback((id: string, titulo: string) => setChats((cs) => cs.map((c) => (c.id === id ? { ...c, titulo: titulo.trim() || c.titulo } : c))), [])
  const chatsOrdenados = useMemo(() => [...chats].sort((a, b) => b.actualizada - a.actualizada), [chats])

  const value = useMemo(() => ({ mensajes, pensando, enviar, detener, limpiar: nuevoChat, nuevoChat, chats: chatsOrdenados, activaId, abrirChat, borrarChat, renombrarChat, ia, url, modelo, setUrl, setModelo, probar, abierto, setAbierto }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mensajes, pensando, enviar, detener, nuevoChat, chatsOrdenados, activaId, abrirChat, borrarChat, renombrarChat, ia, url, modelo, setModelo, probar, abierto])
  return <C.Provider value={value}>{children}</C.Provider>
}

export function useAsistente() {
  const c = useContext(C)
  if (!c) throw new Error('useAsistente debe usarse dentro de <AsistenteProvider>')
  return c
}
