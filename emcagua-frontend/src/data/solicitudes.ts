/** Solicitudes de registro hechas por personas nuevas desde la oficina virtual (las revisa Usuarios). */
import { useEffect, useSyncExternalStore } from 'react'
import { api, MODO_API } from './api'
import { puede } from '../utils/session'

export type SolicitudRegistro = {
  id: number
  radicado: string
  nombre: string
  cedula: string
  telefono: string
  correo: string
  direccion: string
  sector: string
  barrio: string
  estrato: number
  conMedidor: boolean
  medidor: string
  observacion: string
  estado: 'Pendiente' | 'Aprobada' | 'Rechazada'
  motivo: string
  predio: string
  creada: number
  revisadaPor: string
}

let lista: SolicitudRegistro[] = []
const oyentes = new Set<() => void>()
const fijar = (l: SolicitudRegistro[]) => { lista = l; oyentes.forEach((f) => f()) }

export async function cargarSolicitudes() {
  if (!MODO_API || !puede('usuarios')) return
  try { fijar(await api<SolicitudRegistro[]>('/vista/solicitudes')) } catch { /* se quedan las que había */ }
}

let activos = 0
let reloj: ReturnType<typeof setInterval> | undefined

/** Lista de solicitudes; mientras alguien la use se refresca cada minuto. */
export function useSolicitudes() {
  useEffect(() => {
    if (activos++ === 0) { void cargarSolicitudes(); reloj = setInterval(() => void cargarSolicitudes(), 60_000) }
    return () => { if (--activos === 0) clearInterval(reloj) }
  }, [])
  return useSyncExternalStore((f) => { oyentes.add(f); return () => { oyentes.delete(f) } }, () => lista)
}

export async function aprobarSolicitud(id: number, datos: Record<string, unknown>) {
  await api(`/vista/solicitudes/${id}/aprobar`, { metodo: 'POST', cuerpo: datos })
  await cargarSolicitudes()
}

export async function rechazarSolicitud(id: number, motivo: string) {
  await api(`/vista/solicitudes/${id}/rechazar`, { metodo: 'POST', cuerpo: { motivo } })
  await cargarSolicitudes()
}
