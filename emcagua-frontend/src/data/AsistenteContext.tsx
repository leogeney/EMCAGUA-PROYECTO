/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from './DataContext'
import { usePqr } from './PqrContext'
import { useOperacion } from './OperacionContext'
import { calentarOllama, destinoNavegacion, estadoOllama, preguntarOllamaStream, respuestaRapida, responderSinIA, resumenParaModelo, type Mensaje } from './asistente'

const leer = (k: string, d: string) => { try { return localStorage.getItem(k) ?? d } catch { return d } }
const guardar = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* sin almacenamiento */ } }

type Ctx = {
  mensajes: Mensaje[]
  pensando: boolean
  /** Pregunta al asistente. `conIA` fuerza la IA aunque haya respuesta rápida. */
  enviar: (pregunta: string, conIA?: boolean) => void
  detener: () => void
  limpiar: () => void
  ia: { ok: boolean; modelos: string[] } | null
  url: string
  modelo: string
  setUrl: (u: string) => void
  setModelo: (m: string) => void
  probar: (u?: string) => Promise<void>
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
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [pensando, setPensando] = useState(false)
  const [ia, setIa] = useState<{ ok: boolean; modelos: string[] } | null>(null)
  const [url, setUrlState] = useState(() => leer('emc_ollama_url', 'http://localhost:11434'))
  const [modelo, setModeloState] = useState(() => leer('emc_ollama_modelo', ''))
  const control = useRef<AbortController | null>(null)

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
    const rapida = conIA ? null : respuestaRapida(p, ctx)
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
      const final = await preguntarOllamaStream(url, modelo, historial, resumenParaModelo(ctx, p), (parcial) => setMensajes([...historial, { rol: 'asistente', texto: parcial, fuente: 'ollama', escribiendo: true }]), control.current.signal)
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
  }, [mensajes, pensando, usuarios, pagos, pqrs, lecturas, alarmas, materiales, ia, modelo, url, navigate])

  const detener = useCallback(() => control.current?.abort(), [])
  const limpiar = useCallback(() => { control.current?.abort(); setMensajes([]) }, [])

  const value = useMemo(() => ({ mensajes, pensando, enviar, detener, limpiar, ia, url, modelo, setUrl, setModelo, probar }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mensajes, pensando, enviar, detener, limpiar, ia, url, modelo, setModelo, probar])
  return <C.Provider value={value}>{children}</C.Provider>
}

export function useAsistente() {
  const c = useContext(C)
  if (!c) throw new Error('useAsistente debe usarse dentro de <AsistenteProvider>')
  return c
}
