/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useData } from './DataContext'
import { crearPqrDemo, PLAZO_DIAS_HABILES, sumarDiasHabiles } from './pqr'
import type { EstadoPqr, Pqr } from './types'
import { getUsername } from '../utils/session'
import { api, mensajeError, MODO_API } from './api'
import { useToast } from '../components/ui/Toast'

export type NuevaPqr = Omit<Pqr, 'radicado' | 'estado' | 'radicadaEn' | 'vence' | 'historial'>

type Ctx = {
  pqrs: Pqr[]
  /** Radica la PQR. Con la API el radicado lo asigna el servidor; si falla devuelve un error con el mensaje. */
  radicar: (p: NuevaPqr) => Promise<Pqr>
  asignar: (radicado: string, responsable: string) => void
  cambiarEstado: (radicado: string, estado: EstadoPqr) => void
  responder: (radicado: string, respuesta: string) => void
}

const C = createContext<Ctx | null>(null)

export function PqrProvider({ children }: { children: ReactNode }) {
  const { usuarios } = useData()
  const toast = useToast()
  const [pqrs, setPqrs] = useState<Pqr[]>(() => (MODO_API ? [] : crearPqrDemo(usuarios)))
  // Demostración: si los suscriptores llegan después, se siembran las PQR de ejemplo una sola vez
  const [sembrado, setSembrado] = useState(MODO_API || usuarios.length > 0)
  if (!sembrado && usuarios.length) { setSembrado(true); setPqrs(crearPqrDemo(usuarios)) }

  const recargar = useCallback(async () => {
    if (!MODO_API) return
    try { setPqrs(await api<Pqr[]>('/vista/pqrs')) } catch (e) { toast('No se pudieron leer las PQR', mensajeError(e), 'warning') }
  }, [toast])
  useEffect(() => {
    if (!MODO_API) return
    const t = setTimeout(recargar, 0)
    const i = setInterval(recargar, 120_000)
    return () => { clearTimeout(t); clearInterval(i) }
  }, [recargar])

  /** Cambio optimista en pantalla + servidor; si el servidor lo rechaza se avisa y se vuelve a leer. */
  const enApi = useCallback(async (titulo: string, fn: () => Promise<unknown>) => {
    try { await fn() } catch (e) { toast(titulo, mensajeError(e), 'warning') }
    await recargar()
  }, [toast, recargar])

  const evento = (p: Pqr, accion: string, cambios: Partial<Pqr> = {}): Pqr => ({ ...p, ...cambios, historial: [...p.historial, { ts: Date.now(), usuario: getUsername(), accion }] })
  const actualizar = (radicado: string, f: (p: Pqr) => Pqr) => setPqrs((prev) => prev.map((p) => (p.radicado === radicado ? f(p) : p)))

  const radicar = useCallback(
    async (n: NuevaPqr) => {
      if (MODO_API) {
        const p = await api<Pqr>('/vista/pqrs', { metodo: 'POST', cuerpo: n })
        setPqrs((prev) => [p, ...prev])
        return p
      }
      const ahora = new Date()
      const anio = ahora.getFullYear()
      const consecutivo = pqrs.filter((p) => p.radicado.startsWith(`PQR-${anio}-`)).length + 1
      const p: Pqr = {
        ...n,
        radicado: `PQR-${anio}-${String(consecutivo).padStart(4, '0')}`,
        estado: 'Radicada',
        radicadaEn: ahora.getTime(),
        vence: sumarDiasHabiles(ahora, PLAZO_DIAS_HABILES).getTime(),
        historial: [{ ts: ahora.getTime(), usuario: getUsername(), accion: `Radicada por ${n.canal.toLowerCase()}` }],
      }
      setPqrs((prev) => [p, ...prev])
      return p
    },
    [pqrs],
  )

  const asignar = useCallback((r: string, responsable: string) => {
    actualizar(r, (p) => evento(p, `Asignada a ${responsable}`, { responsable, estado: p.estado === 'Radicada' ? 'En trámite' : p.estado }))
    if (MODO_API) void enApi('No se asignó la PQR', () => api(`/vista/pqrs/${r}/asignar`, { metodo: 'POST', cuerpo: { texto: responsable } }))
  }, [enApi])
  const cambiarEstado = useCallback((r: string, estado: EstadoPqr) => {
    actualizar(r, (p) => evento(p, estado === 'Cerrada' ? 'Caso cerrado' : `Estado: ${estado}`, { estado }))
    if (MODO_API) void enApi('No se cambió el estado', () => api(`/vista/pqrs/${r}/estado`, { metodo: 'POST', cuerpo: { texto: estado } }))
  }, [enApi])
  const responder = useCallback((r: string, respuesta: string) => {
    actualizar(r, (p) => evento(p, 'Respuesta enviada al usuario', { respuesta, estado: 'Respondida', respondidaEn: Date.now() }))
    if (MODO_API) void enApi('No se guardó la respuesta', () => api(`/vista/pqrs/${r}/responder`, { metodo: 'POST', cuerpo: { texto: respuesta } }))
  }, [enApi])

  const value = useMemo(() => ({ pqrs, radicar, asignar, cambiarEstado, responder }), [pqrs, radicar, asignar, cambiarEstado, responder])
  return <C.Provider value={value}>{children}</C.Provider>
}

export function usePqr() {
  const c = useContext(C)
  if (!c) throw new Error('usePqr debe usarse dentro de <PqrProvider>')
  return c
}
