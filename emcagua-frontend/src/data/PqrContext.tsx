/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useData } from './DataContext'
import { crearPqrDemo, PLAZO_DIAS_HABILES, sumarDiasHabiles } from './pqr'
import type { EstadoPqr, Pqr } from './types'
import { getUsername } from '../utils/session'

export type NuevaPqr = Omit<Pqr, 'radicado' | 'estado' | 'radicadaEn' | 'vence' | 'historial'>

type Ctx = {
  pqrs: Pqr[]
  radicar: (p: NuevaPqr) => Pqr
  asignar: (radicado: string, responsable: string) => void
  cambiarEstado: (radicado: string, estado: EstadoPqr) => void
  responder: (radicado: string, respuesta: string) => void
}

const C = createContext<Ctx | null>(null)

export function PqrProvider({ children }: { children: ReactNode }) {
  const { usuarios } = useData()
  const [pqrs, setPqrs] = useState<Pqr[]>(() => crearPqrDemo(usuarios))

  const evento = (p: Pqr, accion: string, cambios: Partial<Pqr> = {}): Pqr => ({ ...p, ...cambios, historial: [...p.historial, { ts: Date.now(), usuario: getUsername(), accion }] })
  const actualizar = (radicado: string, f: (p: Pqr) => Pqr) => setPqrs((prev) => prev.map((p) => (p.radicado === radicado ? f(p) : p)))

  const radicar = useCallback(
    (n: NuevaPqr) => {
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

  const asignar = useCallback((r: string, responsable: string) => actualizar(r, (p) => evento(p, `Asignada a ${responsable}`, { responsable, estado: p.estado === 'Radicada' ? 'En trámite' : p.estado })), [])
  const cambiarEstado = useCallback((r: string, estado: EstadoPqr) => actualizar(r, (p) => evento(p, estado === 'Cerrada' ? 'Caso cerrado' : `Estado: ${estado}`, { estado })), [])
  const responder = useCallback((r: string, respuesta: string) => actualizar(r, (p) => evento(p, 'Respuesta enviada al usuario', { respuesta, estado: 'Respondida', respondidaEn: Date.now() })), [])

  const value = useMemo(() => ({ pqrs, radicar, asignar, cambiarEstado, responder }), [pqrs, radicar, asignar, cambiarEstado, responder])
  return <C.Provider value={value}>{children}</C.Provider>
}

export function usePqr() {
  const c = useContext(C)
  if (!c) throw new Error('usePqr debe usarse dentro de <PqrProvider>')
  return c
}
